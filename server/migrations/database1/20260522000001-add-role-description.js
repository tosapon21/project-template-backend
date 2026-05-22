'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const table = await queryInterface.describeTable('roles');
        if (!table.description) {
            await queryInterface.addColumn('roles', 'description', {
                type: Sequelize.STRING(255),
                allowNull: true
            });
        }
    },
    down: async (queryInterface) => {
        const table = await queryInterface.describeTable('roles');
        if (table.description) {
            await queryInterface.removeColumn('roles', 'description');
        }
    }
};
