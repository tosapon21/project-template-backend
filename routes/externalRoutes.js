import express from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../server/models/index.js';
import Time from '../shared/time.js';

const router = express.Router();
const { User, Whitelist } = db.database1;
const defaultUserImage = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="80" fill="#e5e7eb"/>
  <circle cx="80" cy="58" r="34" fill="#6b7280"/>
  <path d="M28 142c7-31 27-48 52-48s45 17 52 48" fill="#6b7280"/>
  <circle cx="80" cy="80" r="77" fill="none" stroke="#cbd5e1" stroke-width="6"/>
</svg>`.trim());

const sendDefaultUserImage = (res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(defaultUserImage);
};

const getEnv = (...names) => {
    for (const name of names) {
        if (process.env[name]) return process.env[name];
    }
    return null;
};

const buildFrontendUrl = (pathValue) => {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/$/, '');
    const pathWithSlash = pathValue?.startsWith('/') ? pathValue : `/${pathValue || ''}`;
    return `${frontendUrl}${pathWithSlash}`;
};

const redirectToFailure = (res, reason) => {
    const failurePath = getEnv('BP_PORTAL_SSO_FAILURE_REDIRECT') || '/login?sso_error=1';
    const failureUrl = new URL(buildFrontendUrl(failurePath));
    failureUrl.searchParams.set('sso_error', reason);
    return res.redirect(failureUrl.toString());
};

const toSafeErrorCode = (message) => {
    if (!message || typeof message !== 'string') return 'exchange_failed';
    return message.toLowerCase().replace(/[^a-z0-9_:-]/g, '_').slice(0, 80);
};

const isSSODebugEnabled = () => process.env.BP_PORTAL_SSO_DEBUG === 'true';

const debugSSO = (label, data) => {
    if (isSSODebugEnabled()) {
        console.log(label, data);
    }
};

const postBPPortalJson = async (pathValue, body) => {
    const baseUrl = getEnv('BP_PORTAL_BASE_URL', 'BP_PORTAL_URL');
    const clientId = getEnv('BP_PORTAL_CLIENT_ID', 'BP_CLIENT_ID');
    const clientSecret = getEnv('BP_PORTAL_CLIENT_SECRET', 'BP_CLIENT_SECRET');

    if (!baseUrl || !clientId || !clientSecret) {
        const err = new Error('BP_PORTAL_SSO_NOT_CONFIGURED');
        err.status = 500;
        throw err;
    }

    debugSSO('[bp-portal-sso-request]', {
        endpoint: `${baseUrl.replace(/\/$/, '')}${pathValue}`,
        body: {
            has_client_id: !!clientId,
            has_client_secret: !!clientSecret,
            has_code: !!body.code,
            has_access_token: !!body.access_token
        }
    });

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${pathValue}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            ...body
        })
    });

    const responseText = await response.text();
    let payload = {};

    if (responseText) {
        try {
            payload = JSON.parse(responseText);
        } catch {
            payload = {};
        }
    }

    if (!response.ok) {
        const err = new Error(payload.message || 'BP_PORTAL_REQUEST_FAILED');
        err.status = response.status;
        err.bpPortalPath = pathValue;
        err.bpPortalBody = payload;
        throw err;
    }

    return payload;
};

const exchangeSSOCode = async (code) => {
    const payload = await postBPPortalJson('/api/v1/sso/exchange-code', { code });
    const bpUser = payload.user || payload.data;

    if (!bpUser?.user_id) {
        const err = new Error('SSO_USER_MISSING');
        err.status = 401;
        throw err;
    }

    return bpUser;
};

const exchangeOAuthCode = async (code) => {
    const tokenPayload = await postBPPortalJson('/oauth/exchange', { code });

    if (!tokenPayload.access_token) {
        const err = new Error('BP_PORTAL_TOKEN_MISSING');
        err.status = 401;
        throw err;
    }

    const userPayload = await postBPPortalJson('/api/v1/verify-token', {
        access_token: tokenPayload.access_token
    });

    if (!userPayload.data?.user_id) {
        const err = new Error('BP_PORTAL_USER_MISSING');
        err.status = 401;
        throw err;
    }

    return userPayload.data;
};

const normalizeUserName = (bpUser) => {
    const fallback = bpUser.email ? bpUser.email.split('@')[0] : `bp_${bpUser.user_id}`;
    return (bpUser.user_name || fallback)
        .toString()
        .trim()
        .replace(/[^a-zA-Z0-9_.-]/g, '_')
        .slice(0, 80);
};

const findLinkOrCreateLocalUser = async (bpUser, transaction) => {
    const bpPortalUserId = String(bpUser.user_id);
    let user = await User.findOne({
        where: { bp_portal_user_id: bpPortalUserId },
        transaction
    });

    if (!user && bpUser.email) {
        user = await User.findOne({
            where: { email: bpUser.email.toLowerCase() },
            transaction
        });

        if (user) {
            await user.update({ bp_portal_user_id: bpPortalUserId }, { transaction });
        }
    }

    if (!user) {
        const userName = normalizeUserName(bpUser);
        const existingUserName = await User.findOne({ where: { user_name: userName }, transaction });
        const safeUserName = existingUserName ? `${userName}_bp_${bpPortalUserId}`.slice(0, 100) : userName;
        const email = (bpUser.email || `${safeUserName}@bp-portal.local`).toLowerCase();
        const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'));

        user = await User.create({
            bp_portal_user_id: bpPortalUserId,
            user_name: safeUserName,
            password: randomPassword,
            email,
            status: 1,
            first_name: bpUser.first_name || bpUser.employee?.first_name || null,
            last_name: bpUser.last_name || bpUser.employee?.last_name || null,
            nick_name: bpUser.nick_name || null,
            profile_img_code: bpUser.profile_img_code || null
        }, { transaction });
    } else {
        if (user.status !== 1) {
            const err = new Error('ACCOUNT_DISABLED');
            err.status = 403;
            throw err;
        }

        await user.update({
            first_name: bpUser.first_name || bpUser.employee?.first_name || user.first_name,
            last_name: bpUser.last_name || bpUser.employee?.last_name || user.last_name,
            nick_name: bpUser.nick_name || user.nick_name,
            profile_img_code: bpUser.profile_img_code || user.profile_img_code
        }, { transaction });
    }

    return user;
};

const createRefreshToken = async (user, transaction) => {
    const accessDuration = parseInt(process.env.ACCESS_TOKEN_DURATION || '60');
    const refreshDuration = parseInt(process.env.REFRESH_TOKEN_DURATION || '1200');
    const payload = {
        user_id: user.id,
        user_name: user.user_name,
        email: user.email
    };

    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: accessDuration });
    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: refreshDuration });

    await Whitelist.bulkCreate([
        {
            user_id: user.id,
            token: accessToken,
            token_type: 'access',
            expire_date: Time.nowPlusSeconds(accessDuration)
        },
        {
            user_id: user.id,
            token: refreshToken,
            token_type: 'refresh',
            expire_date: Time.nowPlusSeconds(refreshDuration)
        }
    ], { transaction });

    return refreshToken;
};

router.get(getEnv('BP_PORTAL_SSO_CALLBACK_PATH') || '/sso/callback', async (req, res) => {
    const code = req.query.code;
    const flow = req.query.bp_sso_flow || 'oauth';
    const callbackUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    if (!code || typeof code !== 'string') {
        return redirectToFailure(res, 'missing_code');
    }

    if (!['active', 'oauth'].includes(flow)) {
        return redirectToFailure(res, 'wrong_flow');
    }

    let transaction;
    try {
        debugSSO('[bp-portal-sso-callback]', {
            callbackUrl,
            flow,
            hasCode: true
        });

        const bpUser = flow === 'active'
            ? await exchangeSSOCode(code)
            : await exchangeOAuthCode(code);
        transaction = await db.sequelize1.transaction();
        const user = await findLinkOrCreateLocalUser(bpUser, transaction);
        const refreshToken = await createRefreshToken(user, transaction);

        await user.update({
            last_login: new Date(),
            failed_login_attempts: 0,
            locked_until: null
        }, { transaction });

        await transaction.commit();

        const successPath = getEnv('BP_PORTAL_SSO_SUCCESS_REDIRECT') || '/home';
        const sessionUrl = new URL(buildFrontendUrl('/auth/sso'));
        sessionUrl.searchParams.set('refresh_token', refreshToken);
        sessionUrl.searchParams.set('returnUrl', successPath);
        return res.redirect(sessionUrl.toString());
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('[bp-portal-sso]', {
            message: err.message,
            status: err.status,
            path: err.bpPortalPath,
            flow,
            callbackUrl,
            responseBody: err.bpPortalBody
        });
        return redirectToFailure(res, toSafeErrorCode(err.message));
    }
});

const sendUserImage = async (req, res, userId) => {
    if (!req.isAuth) return res.status(401).json({ message: 'Not authenticated' });

    let imgCode = req.body?.img_code;

    if (!imgCode) {
        const user = await User.findByPk(userId, { attributes: ['profile_img_code'] });
        imgCode = user?.profile_img_code;
    }

    if (!imgCode) return sendDefaultUserImage(res);

    const sanitized = path.basename(imgCode);
    const imagePath = path.join(process.cwd(), 'images', 'user', sanitized);

    if (!fs.existsSync(imagePath)) return sendDefaultUserImage(res);

    res.sendFile(imagePath);
};

router.post('/user_image', async (req, res) => {
    return sendUserImage(req, res, req.user_id);
});

router.post('/user_image/:id', async (req, res) => {
    return sendUserImage(req, res, req.params.id);
});

export default router;
