'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableInfo = await queryInterface.describeTable('web_texts');
        if (!tableInfo.language_id.references) {
            await queryInterface.changeColumn('web_texts', 'language_id', {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'languages', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            });
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('web_texts', 'language_id', {
            type: Sequelize.INTEGER,
            allowNull: false
        });
    }
};
