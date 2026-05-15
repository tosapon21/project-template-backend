'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('roles', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            role_name: { type: Sequelize.STRING(100), allowNull: false, unique: true }
        });
    },
    down: async (queryInterface) => { await queryInterface.dropTable('roles'); }
};
