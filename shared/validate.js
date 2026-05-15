import db from '../server/models/index.js';

const { User, UserRole, Role, Privilege } = db.database1;

const checkValidate = (condition, message, status) => {
    if (condition) {
        const err = new Error(message);
        err.status = status;
        throw err;
    }
};

const checkPrivilege = async (req, privilege_code) => {
    checkValidate(!req.isAuth, 'NOT_AUTHENTICATED', 401);

    const user = await User.findByPk(req.user_id, {
        include: [{
            model: UserRole,
            include: [{
                model: Role,
                include: [{
                    model: Privilege,
                    through: { attributes: [] },
                    where: { privilege_code },
                    required: true
                }]
            }]
        }]
    });

    checkValidate(
        !user || !user.UserRoles?.some(ur => ur.Role?.Privileges?.length > 0),
        'NOT_AUTHORIZED',
        403
    );

    return true;
};

const isStrongPassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{12,}$/;
    return regex.test(password);
};

const sanitizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>]/g, '');
};

export default { checkValidate, checkPrivilege, isStrongPassword, sanitizeString };
