'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('users', 'first_name', {
            type: Sequelize.STRING(100),
            allowNull: true
        });
        await queryInterface.addColumn('users', 'last_name', {
            type: Sequelize.STRING(100),
            allowNull: true
        });
        await queryInterface.addColumn('users', 'nick_name', {
            type: Sequelize.STRING(100),
            allowNull: true
        });
    },

    down: async (queryInterface) => {
        await queryInterface.removeColumn('users', 'nick_name');
        await queryInterface.removeColumn('users', 'last_name');
        await queryInterface.removeColumn('users', 'first_name');
    }
};
