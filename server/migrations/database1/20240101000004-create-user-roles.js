'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('user_roles', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'CASCADE'
            },
            role_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'roles', key: 'id' },
                onDelete: 'CASCADE'
            }
        });
        await queryInterface.addIndex('user_roles', ['user_id', 'role_id'], { unique: true });
    },
    down: async (queryInterface) => { await queryInterface.dropTable('user_roles'); }
};
