'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('users', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            user_name: { type: Sequelize.STRING(100), allowNull: false, unique: true },
            password: { type: Sequelize.STRING(255), allowNull: false },
            email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
            status: { type: Sequelize.TINYINT, defaultValue: 0 },
            last_login: { type: Sequelize.DATE },
            profile_img_code: { type: Sequelize.STRING(255) },
            failed_login_attempts: { type: Sequelize.INTEGER, defaultValue: 0 },
            locked_until: { type: Sequelize.DATE },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false }
        });
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('users');
    }
};
