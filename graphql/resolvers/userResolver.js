import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import validator from 'validator';
import db from '../../server/models/index.js';
import Validate from '../../shared/validate.js';
import Permission from '../../shared/permission.js';
import Time from '../../shared/time.js';

const { User, Whitelist } = db.database1;

const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;
const WINDOW_MINUTES = 15;

const checkRateLimit = (key) => {
    const now = Date.now();
    const entry = loginAttempts.get(key) || { attempts: 0, firstAttempt: now, lockedUntil: null };

    if (entry.lockedUntil && now < entry.lockedUntil) {
        const minutesLeft = Math.ceil((entry.lockedUntil - now) / 60000);
        const err = new Error(`ACCOUNT_LOCKED:${minutesLeft}`);
        err.status = 429;
        throw err;
    }

    if (now - entry.firstAttempt > WINDOW_MINUTES * 60000) {
        loginAttempts.set(key, { attempts: 1, firstAttempt: now, lockedUntil: null });
        return;
    }

    if (entry.attempts >= MAX_ATTEMPTS) {
        entry.lockedUntil = now + LOCKOUT_MINUTES * 60000;
        loginAttempts.set(key, entry);
        const err = new Error(`ACCOUNT_LOCKED:${LOCKOUT_MINUTES}`);
        err.status = 429;
        throw err;
    }

    entry.attempts += 1;
    loginAttempts.set(key, entry);
};

const resetRateLimit = (key) => {
    loginAttempts.delete(key);
};

const generateTokens = async (user, transaction) => {
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

    return { accessToken, refreshToken, accessDuration };
};

export default {
    Query: {
        async logIn(obj, args, { req }) {
            const { login, password } = args.lginput;
            const ip = req.ip || 'unknown';
            const rateLimitKey = `${ip}:${login}`;

            Validate.checkValidate(!login || validator.isEmpty(login), 'INVALID_INPUT', 400);
            Validate.checkValidate(!password || validator.isEmpty(password), 'INVALID_INPUT', 400);

            checkRateLimit(rateLimitKey);

            const user = await User.findOne({
                where: {
                    [Op.or]: [
                        { user_name: login },
                        { email: login }
                    ]
                }
            });

            if (!user) {
                const err = new Error('INVALID_CREDENTIALS');
                err.status = 401;
                throw err;
            }

            if (user.locked_until && new Date() < user.locked_until) {
                const err = new Error('ACCOUNT_LOCKED');
                err.status = 429;
                throw err;
            }

            const passwordMatch = await bcrypt.compare(password, user.password);

            if (!passwordMatch) {
                await user.increment('failed_login_attempts');
                if (user.failed_login_attempts + 1 >= MAX_ATTEMPTS) {
                    await user.update({ locked_until: Time.nowPlusSeconds(LOCKOUT_MINUTES * 60) });
                }
                const err = new Error('INVALID_CREDENTIALS');
                err.status = 401;
                throw err;
            }

            Validate.checkValidate(user.status !== 1, 'ACCOUNT_DISABLED', 403);

            const transaction = await db.sequelize1.transaction();
            try {
                const { refreshToken } = await generateTokens(user, transaction);
                await user.update({
                    last_login: new Date(),
                    failed_login_attempts: 0,
                    locked_until: null
                }, { transaction });
                await transaction.commit();
                resetRateLimit(rateLimitKey);
                return refreshToken;
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        },

        async getAccessToken(obj, args, { req }) {
            Validate.checkValidate(!req.isAuth || req.tokenType !== 'refresh', req.authError || 'NOT_AUTHENTICATED', 401);

            const decoded = jwt.verify(req.token, process.env.REFRESH_TOKEN_SECRET);
            const user = await User.findByPk(decoded.user_id);
            Validate.checkValidate(!user || user.status !== 1, 'ACCOUNT_DISABLED', 403);

            const transaction = await db.sequelize1.transaction();
            try {
                // Refresh token rotation: delete all existing tokens for this user
                await Whitelist.destroy({
                    where: {
                        user_id: user.id,
                        token_type: { [Op.in]: ['access', 'refresh'] }
                    },
                    transaction
                });

                const { accessToken, refreshToken, accessDuration } = await generateTokens(user, transaction);
                const permissions = await Permission.getPermissionList(user.id);

                await transaction.commit();

                return {
                    access_token: accessToken,
                    id: user.id,
                    email: user.email,
                    user_name: user.user_name,
                    expires_in: accessDuration,
                    permission: permissions,
                    refresh_token: refreshToken
                };
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        },

        async checkPermission(obj, args, { req }) {
            if (!req.isAuth) return false;
            try {
                await Validate.checkPrivilege(req, args.permission_string);
                return true;
            } catch {
                return false;
            }
        },

        async getUserDetail(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'VIEW_USER_DETAIL');
            const user = await User.findByPk(args.id, {
                attributes: ['id', 'user_name', 'email', 'status', 'last_login', 'profile_img_code', 'createdAt']
            });
            Validate.checkValidate(!user, 'USER_NOT_FOUND', 404);
            return user;
        }
    },

    Mutation: {
        async signUp(obj, args, { req }) {
            const { login, password, email } = args.suinput;

            Validate.checkValidate(!login || validator.isEmpty(login), 'INVALID_USERNAME', 400);
            Validate.checkValidate(!validator.isLength(login, { min: 3, max: 50 }), 'USERNAME_INVALID_LENGTH', 400);
            Validate.checkValidate(!email || !validator.isEmail(email), 'INVALID_EMAIL', 400);
            Validate.checkValidate(!Validate.isStrongPassword(password), 'WEAK_PASSWORD', 400);

            const existing = await User.findOne({
                where: { [Op.or]: [{ user_name: login }, { email }] }
            });
            Validate.checkValidate(!!existing, 'USER_EXISTS', 409);

            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
            const hashedPW = await bcrypt.hash(password, saltRounds);

            await User.create({
                user_name: login,
                password: hashedPW,
                email: email.toLowerCase(),
                status: 0
            });

            return true;
        },

        async logout(obj, args, { req }) {
            if (!req.isAuth) return true;
            await Whitelist.destroy({ where: { user_id: req.user_id } });
            return true;
        },

        async changePassword(obj, args, { req }) {
            Validate.checkValidate(!req.isAuth, 'NOT_AUTHENTICATED', 401);

            const { current_password, new_password } = args.cpinput;
            Validate.checkValidate(!Validate.isStrongPassword(new_password), 'WEAK_PASSWORD', 400);

            const user = await User.findByPk(req.user_id);
            const match = await bcrypt.compare(current_password, user.password);
            Validate.checkValidate(!match, 'WRONG_PASSWORD', 401);

            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
            const newHash = await bcrypt.hash(new_password, saltRounds);
            await user.update({ password: newHash });

            // Invalidate all tokens to force re-login
            await Whitelist.destroy({ where: { user_id: req.user_id } });
            return true;
        },

        async cleanupWhitelist(obj, args, { req }) {
            if (!req.isAuth) return true;
            await Whitelist.destroy({
                where: {
                    user_id: req.user_id,
                    expire_date: { [Op.lt]: new Date() }
                }
            });
            return true;
        }
    }
};
