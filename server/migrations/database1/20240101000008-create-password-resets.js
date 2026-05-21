'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('password_resets', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            token_hash: { type: Sequelize.STRING(128), allowNull: false, unique: true },
            expire_date: { type: Sequelize.DATE, allowNull: false },
            used_at: { type: Sequelize.DATE },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false }
        });

        await queryInterface.addIndex('password_resets', ['user_id']);
        await queryInterface.addIndex('password_resets', ['expire_date']);
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('password_resets');
    }
};
