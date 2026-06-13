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
    up: async (queryInterface) => {
        const [existingRows] = await queryInterface.sequelize.query('SELECT id FROM languages');
        const existingIds = new Set(existingRows.map(row => row.id));
        const missingLanguages = languages.filter(language => !existingIds.has(language.id));

        if (missingLanguages.length > 0) {
            await queryInterface.bulkInsert('languages', missingLanguages, {});
        }
    },

    down: async (queryInterface) => {
        await queryInterface.bulkDelete('languages', {
            id: languages.map(language => language.id)
        }, {});
    }
};
