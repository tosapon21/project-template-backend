'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('role_privileges', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            role_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'roles', key: 'id' },
                onDelete: 'CASCADE'
            },
            privilege_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'privileges', key: 'id' },
                onDelete: 'CASCADE'
            }
        });
        await queryInterface.addIndex('role_privileges', ['role_id', 'privilege_id'], { unique: true });
    },
    down: async (queryInterface) => { await queryInterface.dropTable('role_privileges'); }
};
