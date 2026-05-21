import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import path from 'path';
import validator from 'validator';
import { GraphQLUpload } from 'graphql-upload';
import db from '../../server/models/index.js';
import Validate from '../../shared/validate.js';
import Permission from '../../shared/permission.js';
import Time from '../../shared/time.js';
import Mail from '../../shared/mail.js';

const { User, Whitelist, EmailVerification, PasswordReset } = db.database1;

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

const hashEmailVerifyToken = (token) => {
    return crypto
        .createHmac('sha256', process.env.EMAIL_VERIFY_SECRET || process.env.ACCESS_TOKEN_SECRET)
        .update(token)
        .digest('hex');
};

const createEmailVerification = async (user, transaction) => {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashEmailVerifyToken(token);
    const duration = parseInt(process.env.EMAIL_VERIFY_DURATION || '86400');

    await EmailVerification.destroy({
        where: { user_id: user.id, used_at: null },
        transaction
    });

    await EmailVerification.create({
        user_id: user.id,
        token_hash: tokenHash,
        expire_date: Time.nowPlusSeconds(duration)
    }, { transaction });

    return token;
};

const hashPasswordResetToken = (token) => {
    return crypto
        .createHmac('sha256', process.env.PASSWORD_RESET_SECRET || process.env.EMAIL_VERIFY_SECRET || process.env.ACCESS_TOKEN_SECRET)
        .update(token)
        .digest('hex');
};

const createPasswordReset = async (user, transaction) => {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashPasswordResetToken(token);
    const duration = parseInt(process.env.PASSWORD_RESET_DURATION || '1800');

    await PasswordReset.destroy({
        where: { user_id: user.id, used_at: null },
        transaction
    });

    await PasswordReset.create({
        user_id: user.id,
        token_hash: tokenHash,
        expire_date: Time.nowPlusSeconds(duration)
    }, { transaction });

    return token;
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
    Upload: GraphQLUpload,

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

        async getMyProfile(obj, args, { req }) {
            Validate.checkValidate(!req.isAuth, 'NOT_AUTHENTICATED', 401);

            const user = await User.findByPk(req.user_id, {
                attributes: [
                    'id',
                    'user_name',
                    'email',
                    'status',
                    'last_login',
                    'profile_img_code',
                    'first_name',
                    'last_name',
                    'nick_name',
                    'createdAt'
                ]
            });
            Validate.checkValidate(!user, 'USER_NOT_FOUND', 404);
            return user;
        },

        async getUserDetail(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'VIEW_USER_DETAIL');
            const user = await User.findByPk(args.id, {
                attributes: ['id', 'user_name', 'email', 'status', 'last_login', 'profile_img_code', 'first_name', 'last_name', 'nick_name', 'createdAt']
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
            //Validate.checkValidate(!Validate.isStrongPassword(password), 'WEAK_PASSWORD', 400);

            const existing = await User.findOne({
                where: { [Op.or]: [{ user_name: login }, { email }] }
            });
            Validate.checkValidate(!!existing, 'USER_EXISTS', 409);

            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
            const hashedPW = await bcrypt.hash(password, saltRounds);

            const transaction = await db.sequelize1.transaction();
            let verifyToken;
            let user;

            try {
                user = await User.create({
                    user_name: login,
                    password: hashedPW,
                    email: email.toLowerCase(),
                    status: 0
                }, { transaction });

                verifyToken = await createEmailVerification(user, transaction);

                await transaction.commit();
            } catch (err) {
                await transaction.rollback();
                throw err;
            }

            await Mail.sendVerificationEmail(user.email, verifyToken);

            return true;
        },

        async verifyEmail(obj, args) {
            Validate.checkValidate(!args.key || validator.isEmpty(args.key), 'INVALID_VERIFICATION_KEY', 400);

            const tokenHash = hashEmailVerifyToken(args.key);
            const verification = await EmailVerification.findOne({
                where: {
                    token_hash: tokenHash,
                    used_at: null
                }
            });

            Validate.checkValidate(!verification, 'INVALID_VERIFICATION_KEY', 400);
            Validate.checkValidate(new Date() > new Date(verification.expire_date), 'VERIFICATION_KEY_EXPIRED', 400);

            const user = await User.findByPk(verification.user_id);
            Validate.checkValidate(!user, 'USER_NOT_FOUND', 404);

            const transaction = await db.sequelize1.transaction();
            try {
                await user.update({ status: 1 }, { transaction });
                await verification.update({ used_at: new Date() }, { transaction });
                await EmailVerification.destroy({
                    where: {
                        user_id: user.id,
                        used_at: null
                    },
                    transaction
                });
                await transaction.commit();
                return true;
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        },

        async requestPasswordReset(obj, args) {
            Validate.checkValidate(!args.email || !validator.isEmail(args.email), 'INVALID_EMAIL', 400);

            const user = await User.findOne({ where: { email: args.email.toLowerCase() } });

            // Avoid account enumeration: valid request always returns true.
            if (!user || user.status !== 1) {
                return true;
            }

            const transaction = await db.sequelize1.transaction();
            let resetToken;

            try {
                resetToken = await createPasswordReset(user, transaction);
                await transaction.commit();
            } catch (err) {
                await transaction.rollback();
                throw err;
            }

            await Mail.sendPasswordResetEmail(user.email, resetToken);

            return true;
        },

        async resetPassword(obj, args) {
            Validate.checkValidate(!args.key || validator.isEmpty(args.key), 'INVALID_RESET_KEY', 400);
            //Validate.checkValidate(!Validate.isStrongPassword(args.new_password), 'WEAK_PASSWORD', 400);

            const tokenHash = hashPasswordResetToken(args.key);
            const reset = await PasswordReset.findOne({
                where: {
                    token_hash: tokenHash,
                    used_at: null
                }
            });

            Validate.checkValidate(!reset, 'INVALID_RESET_KEY', 400);
            Validate.checkValidate(new Date() > new Date(reset.expire_date), 'RESET_KEY_EXPIRED', 400);

            const user = await User.findByPk(reset.user_id);
            Validate.checkValidate(!user, 'USER_NOT_FOUND', 404);

            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
            const newHash = await bcrypt.hash(args.new_password, saltRounds);
            const transaction = await db.sequelize1.transaction();

            try {
                await user.update({
                    password: newHash,
                    failed_login_attempts: 0,
                    locked_until: null
                }, { transaction });
                await reset.update({ used_at: new Date() }, { transaction });
                await PasswordReset.destroy({
                    where: {
                        user_id: user.id,
                        used_at: null
                    },
                    transaction
                });
                await Whitelist.destroy({ where: { user_id: user.id }, transaction });
                await transaction.commit();
                return true;
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        },

        async logout(obj, args, { req }) {
            if (!req.isAuth) return true;
            await Whitelist.destroy({ where: { user_id: req.user_id } });
            return true;
        },

        async changePassword(obj, args, { req }) {
            Validate.checkValidate(!req.isAuth, 'NOT_AUTHENTICATED', 401);

            const { current_password, new_password } = args.cpinput;
            //Validate.checkValidate(!Validate.isStrongPassword(new_password), 'WEAK_PASSWORD', 400);

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

        async updateMyProfile(obj, args, { req }) {
            Validate.checkValidate(!req.isAuth, 'NOT_AUTHENTICATED', 401);

            const { first_name, last_name, nick_name } = args.profile_input;
            const cleanProfile = {
                first_name: first_name ? Validate.sanitizeString(first_name).slice(0, 100) : null,
                last_name: last_name ? Validate.sanitizeString(last_name).slice(0, 100) : null,
                nick_name: nick_name ? Validate.sanitizeString(nick_name).slice(0, 100) : null
            };

            const user = await User.findByPk(req.user_id);
            Validate.checkValidate(!user, 'USER_NOT_FOUND', 404);

            await user.update(cleanProfile);

            return User.findByPk(req.user_id, {
                attributes: ['id', 'user_name', 'email', 'status', 'last_login', 'profile_img_code', 'first_name', 'last_name', 'nick_name', 'createdAt']
            });
        },

        async updateProfileImage(obj, args, { req }) {
            Validate.checkValidate(!req.isAuth, 'NOT_AUTHENTICATED', 401);

            const { createReadStream } = await args.file;
            const fileExt = (args.file_ext || 'png').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'png';
            Validate.checkValidate(!['png', 'jpg', 'jpeg', 'webp'].includes(fileExt), 'INVALID_FILE_TYPE', 400);

            const user = await User.findByPk(req.user_id);
            Validate.checkValidate(!user, 'USER_NOT_FOUND', 404);

            const imageDir = path.join(process.cwd(), 'images', 'user');
            fs.mkdirSync(imageDir, { recursive: true });

            const imageCode = `user_${req.user_id}_${Date.now()}.${fileExt}`;
            const imagePath = path.join(imageDir, imageCode);

            await new Promise((resolve, reject) => {
                const stream = createReadStream();
                const writeStream = fs.createWriteStream(imagePath);
                stream.on('error', reject);
                writeStream.on('error', reject);
                writeStream.on('finish', resolve);
                stream.pipe(writeStream);
            });

            await user.update({ profile_img_code: imageCode });
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
