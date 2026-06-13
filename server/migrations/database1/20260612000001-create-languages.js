'use strict';

const languages = [
    { id: 1, symbol: 'EN', description: 'English' },
    { id: 2, symbol: 'JP', description: 'Japanese' },
    { id: 3, symbol: 'TH', description: 'Thai' },
    { id: 4, symbol: 'CN', description: 'Chinese Traditional' },
    { id: 5, symbol: 'KR', description: 'Korean' },
    { id: 6, symbol: 'FR', description: 'French' }
];

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('languages', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            symbol: { type: Sequelize.STRING(10), allowNull: false, unique: true },
            description: { type: Sequelize.STRING(100), allowNull: false }
        });

        await queryInterface.bulkInsert('languages', languages, {});
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('languages');
    }
};
