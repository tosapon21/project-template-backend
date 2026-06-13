export default (sequelize, DataTypes) => {
    const WebText = sequelize.define('WebText', {
        type: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        language_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'languages',
                key: 'id'
            }
        },
        tag_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        text: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    }, {
        tableName: 'web_texts',
        indexes: [
            {
                unique: true,
                fields: ['language_id', 'tag_name']
            }
        ]
    });

    WebText.associate = (models) => {
        WebText.belongsTo(models.Language, {
            foreignKey: 'language_id',
            as: 'language'
        });
    };

    return WebText;
};
