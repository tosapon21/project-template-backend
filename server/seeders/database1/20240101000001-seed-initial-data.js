'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
    up: async (queryInterface) => {
        // Roles
        await queryInterface.bulkInsert('roles', [
            { role_name: 'Admin', description: 'Full access to all features and settings' },
            { role_name: 'User', description: 'Standard application access' }
        ], {});

        // Privileges
        await queryInterface.bulkInsert('privileges', [
            { type: 'SYSTEM', privilege_code: 'IS_ADMIN', description: 'Full system access' },
            { type: 'USER', privilege_code: 'VIEW_USER_DETAIL', description: 'View user details' },
            { type: 'CONTENT', privilege_code: 'MANAGE_CONTENT', description: 'Manage content' }
        ], {});

        // Role-privileges: Admin gets all
        const [privileges] = await queryInterface.sequelize.query('SELECT id FROM privileges');
        const [roles] = await queryInterface.sequelize.query('SELECT id FROM roles WHERE role_name = "Admin"');
        const adminRoleId = roles[0].id;

        await queryInterface.bulkInsert('role_privileges',
            privileges.map(p => ({ role_id: adminRoleId, privilege_id: p.id })), {});

        // Admin user
        const hashedPassword = bcrypt.hashSync('admin1234', 12);
        await queryInterface.bulkInsert('users', [{
            user_name: 'admin',
            password: hashedPassword,
            email: 'admin@template.local',
            status: 1,
            failed_login_attempts: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        }], {});

        // Assign admin role to admin user
        const [users] = await queryInterface.sequelize.query('SELECT id FROM users WHERE user_name = "admin"');
        await queryInterface.bulkInsert('user_roles', [
            { user_id: users[0].id, role_id: adminRoleId }
        ], {});
    },

    down: async (queryInterface) => {
        await queryInterface.bulkDelete('user_roles', null, {});
        await queryInterface.bulkDelete('role_privileges', null, {});
        await queryInterface.bulkDelete('whitelist', null, {});
        await queryInterface.bulkDelete('users', null, {});
        await queryInterface.bulkDelete('roles', null, {});
        await queryInterface.bulkDelete('privileges', null, {});
    }
};
