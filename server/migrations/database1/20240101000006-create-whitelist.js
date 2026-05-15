'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('whitelist', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'CASCADE'
            },
            token: { type: Sequelize.TEXT, allowNull: false },
            token_type: { type: Sequelize.ENUM('access', 'refresh'), allowNull: false },
            expire_date: { type: Sequelize.DATE, allowNull: false },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false }
        });
        await queryInterface.addIndex('whitelist', ['user_id', 'token_type']);
        await queryInterface.addIndex('whitelist', ['expire_date']);
    },
    down: async (queryInterface) => { await queryInterface.dropTable('whitelist'); }
};
