'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('privileges', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            type: { type: Sequelize.STRING(50), allowNull: false },
            privilege_code: { type: Sequelize.STRING(100), allowNull: false, unique: true },
            description: { type: Sequelize.STRING(255) }
        });
    },
    down: async (queryInterface) => { await queryInterface.dropTable('privileges'); }
};
