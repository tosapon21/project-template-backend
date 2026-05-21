import jwt from 'jsonwebtoken';
import db1 from '../server/models/index.js';

const { Whitelist } = db1.database1;

export default async (req, res, next) => {
    const authHeader = req.get('Authorization');
    req.isAuth = false;

    try {
        let token, tokenType;

        if (authHeader) {
            const parts = authHeader.split(' ');
            const isRefreshRequest = req.body?.auth_type === 'refresh';

            if ((parts.length === 3 && parts[1] === 'refresh') || (parts.length === 2 && parts[0] === 'Bearer' && isRefreshRequest)) {
                token = parts[parts.length - 1];
                tokenType = 'refresh';
            } else if (parts.length === 2 && parts[0] === 'Bearer') {
                token = parts[1];
                tokenType = 'access';
            }
        } else if (req.body?.auth_type === 'refresh') {
            const bodyAuth = req.get('Authorization');
            if (bodyAuth) {
                token = bodyAuth.split(' ')[1];
                tokenType = 'refresh';
            }
        }

        if (!token || !tokenType) return next();

        const secret = tokenType === 'refresh'
            ? process.env.REFRESH_TOKEN_SECRET
            : process.env.ACCESS_TOKEN_SECRET;

        const decoded = jwt.verify(token, secret);

        const whitelistEntry = await Whitelist.findOne({
            where: { token, token_type: tokenType, user_id: decoded.user_id }
        });

        if (!whitelistEntry) {
            req.authError = 'TOKEN_REVOKED';
            return next();
        }

        if (new Date() > new Date(whitelistEntry.expire_date)) {
            req.authError = 'TOKEN_EXPIRED';
            return next();
        }

        req.isAuth = true;
        req.user_id = decoded.user_id;
        req.user_name = decoded.user_name;
        req.email = decoded.email;
        req.token = token;
        req.tokenType = tokenType;

    } catch (err) {
        req.authError = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    }

    next();
};
