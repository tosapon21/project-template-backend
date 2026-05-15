import db from '../server/models/index.js';

const { User, UserRole, Role, Privilege } = db.database1;

const getPermissionList = async (user_id) => {
    const user = await User.findByPk(user_id, {
        include: [{
            model: UserRole,
            include: [{
                model: Role,
                include: [{
                    model: Privilege,
                    through: { attributes: [] }
                }]
            }]
        }]
    });

    if (!user) return [];

    const permissions = new Set();
    user.UserRoles?.forEach(userRole => {
        userRole.Role?.Privileges?.forEach(privilege => {
            permissions.add(privilege.privilege_code);
        });
    });

    return [...permissions];
};

export default { getPermissionList };
