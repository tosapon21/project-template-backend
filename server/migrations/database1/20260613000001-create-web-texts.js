'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('web_texts', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            type: { type: Sequelize.STRING(50), allowNull: false },
            language_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'languages', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            tag_name: { type: Sequelize.STRING(100), allowNull: false },
            text: { type: Sequelize.TEXT, allowNull: false },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false }
        });

        await queryInterface.addIndex('web_texts', ['language_id', 'tag_name'], {
            unique: true,
            name: 'web_texts_language_tag_unique'
        });
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('web_texts');
    }
};
