import validator from 'validator';
import { Op } from 'sequelize';
import db from '../../server/models/index.js';
import Validate from '../../shared/validate.js';

const { User, Role, Privilege, UserRole, RolePrivilege, Whitelist } = db.database1;

export default {
    Query: {
        async getUserList(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'IS_ADMIN');
            return User.findAll({
                attributes: ['id', 'user_name', 'email', 'status', 'last_login', 'profile_img_code', 'createdAt']
            });
        },

        async getRoleList(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'IS_ADMIN');
            const roles = await Role.findAll();
            return {
                role_count: roles.length,
                role_list: roles
            };
        },

        async getPrivilegeList(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'IS_ADMIN');
            return Privilege.findAll();
        },

        async getPrivilege(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'IS_ADMIN');
            const privilege = await Privilege.findByPk(args.id);
            Validate.checkValidate(!privilege, 'PRIVILEGE_NOT_FOUND', 404);
            return privilege;
        },

        async getUserRole(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'IS_ADMIN');

            const user = await User.findByPk(args.id, {
                include: [{
                    model: UserRole,
                    include: [{ model: Role }]
                }]
            });
            Validate.checkValidate(!user, 'USER_NOT_FOUND', 404);

            return user.UserRoles?.map(userRole => userRole.Role).filter(Boolean) || [];
        },

        async getUserRoleList(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'IS_ADMIN');
            const users = await User.findAll({
                attributes: ['id', 'user_name', 'email'],
                include: [{
                    model: UserRole,
                    include: [{ model: Role }]
                }]
            });
            return users.map(u => ({
                id: u.id,
                user_name: u.user_name,
                email: u.email,
                roles: u.UserRoles?.map(ur => ur.Role).filter(Boolean) || []
            }));
        },

        async getRolePrivilege(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'IS_ADMIN');

            const role = await Role.findByPk(args.id, {
                include: [{
                    model: Privilege,
                    through: { attributes: [] }
                }]
            });
            Validate.checkValidate(!role, 'ROLE_NOT_FOUND', 404);

            return role.Privileges || [];
        },

        async getRolePrivilegeList(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'IS_ADMIN');
            const roles = await Role.findAll({
                include: [{
                    model: Privilege,
                    through: { attributes: [] }
                }]
            });
            return roles.map(r => ({
                id: r.id,
                role_name: r.role_name,
                privileges: r.Privileges || []
            }));
        }
    },

    Mutation: {
        async addRole(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'IS_ADMIN');
            const { role_name } = args.role_input;

            Validate.checkValidate(!role_name || validator.isEmpty(role_name.trim()), 'INVALID_ROLE_NAME', 400);
            Validate.checkValidate(!validator.isLength(role_name.trim(), { min: 2, max: 100 }), 'ROLE_NAME_INVALID_LENGTH', 400);

            const existing = await Role.findOne({ where: { role_name: role_name.trim() } });
            Validate.checkValidate(!!existing, 'ROLE_EXISTS', 409);

            await Role.create({ role_name: role_name.trim() });
            return true;
        },

        async deleteRole(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'IS_ADMIN');
            const role = await Role.findByPk(args.role_id);
            Validate.checkValidate(!role, 'ROLE_NOT_FOUND', 404);

            const transaction = await db.sequelize1.transaction();
            try {
                await RolePrivilege.destroy({ where: { role_id: args.role_id }, transaction });
                await UserRole.destroy({ where: { role_id: args.role_id }, transaction });
                await role.destroy({ transaction });
                await transaction.commit();
                return true;
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        },

        async addPrivilege(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'IS_ADMIN');
            const { type, privilege_code, description } = args.privilege_input;

            Validate.checkValidate(!type || validator.isEmpty(type.trim()), 'INVALID_TYPE', 400);
            Validate.checkValidate(!privilege_code || validator.isEmpty(privilege_code.trim()), 'INVALID_CODE', 400);
            Validate.checkValidate(!validator.isLength(type.trim(), { min: 1, max: 50 }), 'TYPE_TOO_LONG', 400);
            Validate.checkValidate(!validator.isLength(privilege_code.trim(), { min: 1, max: 100 }), 'CODE_TOO_LONG', 400);
            Validate.checkValidate(!validator.isAlphanumeric(privilege_code.trim().replace(/_/g, '')), 'CODE_INVALID_FORMAT', 400);

            const existing = await Privilege.findOne({ where: { privilege_code: privilege_code.trim().toUpperCase() } });
            Validate.checkValidate(!!existing, 'PRIVILEGE_EXISTS', 409);

            return Privilege.create({
                type: type.trim(),
                privilege_code: privilege_code.trim().toUpperCase(),
                description: description ? Validate.sanitizeString(description) : null
            });
        },

        async updatePrivilege(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'IS_ADMIN');
            const { type, privilege_code, description } = args.privilege_input;

            const privilege = await Privilege.findByPk(args.privilege_id);
            Validate.checkValidate(!privilege, 'PRIVILEGE_NOT_FOUND', 404);

            Validate.checkValidate(!type || validator.isEmpty(type.trim()), 'INVALID_TYPE', 400);
            Validate.checkValidate(!privilege_code || validator.isEmpty(privilege_code.trim()), 'INVALID_CODE', 400);
            Validate.checkValidate(!validator.isLength(type.trim(), { min: 1, max: 50 }), 'TYPE_TOO_LONG', 400);
            Validate.checkValidate(!validator.isLength(privilege_code.trim(), { min: 1, max: 100 }), 'CODE_TOO_LONG', 400);
            Validate.checkValidate(!validator.isAlphanumeric(privilege_code.trim().replace(/_/g, '')), 'CODE_INVALID_FORMAT', 400);

            const normalizedCode = privilege_code.trim().toUpperCase();
            const existing = await Privilege.findOne({
                where: {
                    privilege_code: normalizedCode,
                    id: { [Op.ne]: args.privilege_id }
                }
            });
            Validate.checkValidate(!!existing, 'PRIVILEGE_EXISTS', 409);

            await privilege.update({
                type: type.trim(),
                privilege_code: normalizedCode,
                description: description ? Validate.sanitizeString(description) : null
            });

            return privilege;
        },

        async deletePrivilege(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'IS_ADMIN');
            const privilege = await Privilege.findByPk(args.privilege_id);
            Validate.checkValidate(!privilege, 'PRIVILEGE_NOT_FOUND', 404);

            const transaction = await db.sequelize1.transaction();
            try {
                await RolePrivilege.destroy({ where: { privilege_id: args.privilege_id }, transaction });
                await privilege.destroy({ transaction });
                await transaction.commit();
                return true;
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        },

        async setUserRole(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'IS_ADMIN');
            const { user_id, role_id_list } = args;

            const user = await User.findByPk(user_id);
            Validate.checkValidate(!user, 'USER_NOT_FOUND', 404);

            if (role_id_list.length > 0) {
                const roles = await Role.findAll({ where: { id: role_id_list } });
                Validate.checkValidate(roles.length !== role_id_list.length, 'INVALID_ROLE_IDS', 400);
            }

            const transaction = await db.sequelize1.transaction();
            try {
                await UserRole.destroy({ where: { user_id }, transaction });
                if (role_id_list.length > 0) {
                    await UserRole.bulkCreate(
                        role_id_list.map(role_id => ({ user_id, role_id })),
                        { transaction }
                    );
                }
                await transaction.commit();
                return true;
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        },

        async setRolePrivilege(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'IS_ADMIN');
            const { role_id, privilege_id_list } = args;

            const role = await Role.findByPk(role_id);
            Validate.checkValidate(!role, 'ROLE_NOT_FOUND', 404);

            if (privilege_id_list.length > 0) {
                const privileges = await Privilege.findAll({ where: { id: privilege_id_list } });
                Validate.checkValidate(privileges.length !== privilege_id_list.length, 'INVALID_PRIVILEGE_IDS', 400);
            }

            const transaction = await db.sequelize1.transaction();
            try {
                await RolePrivilege.destroy({ where: { role_id }, transaction });
                if (privilege_id_list.length > 0) {
                    await RolePrivilege.bulkCreate(
                        privilege_id_list.map(privilege_id => ({ role_id, privilege_id })),
                        { transaction }
                    );
                }
                await transaction.commit();
                return true;
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        },

        async setUserStatus(obj, args, { req }) {
            await Validate.checkPrivilege(req, 'IS_ADMIN');
            Validate.checkValidate(![0, 1].includes(args.status), 'INVALID_STATUS', 400);

            const user = await User.findByPk(args.user_id);
            Validate.checkValidate(!user, 'USER_NOT_FOUND', 404);
            Validate.checkValidate(user.user_name === 'admin' && args.status === 0, 'ADMIN_USER_CANNOT_BE_DISABLED', 400);

            await user.update({ status: args.status });

            if (args.status === 0) {
                await Whitelist.destroy({ where: { user_id: args.user_id } });
            }

            return true;
        }
    }
};
