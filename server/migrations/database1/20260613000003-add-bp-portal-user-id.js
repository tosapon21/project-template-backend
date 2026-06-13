'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('users', 'bp_portal_user_id', {
            type: Sequelize.STRING(100),
            allowNull: true
        });
        await queryInterface.addIndex('users', ['bp_portal_user_id'], {
            name: 'users_bp_portal_user_id_unique',
            unique: true
        });
    },

    down: async (queryInterface) => {
        await queryInterface.removeIndex('users', 'users_bp_portal_user_id_unique');
        await queryInterface.removeColumn('users', 'bp_portal_user_id');
    }
};
