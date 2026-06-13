export default (sequelize, DataTypes) => {
    const Language = sequelize.define('Language', {
        symbol: {
            type: DataTypes.STRING(10),
            allowNull: false,
            unique: true
        },
        description: {
            type: DataTypes.STRING(100),
            allowNull: false
        }
    }, {
        tableName: 'languages',
        timestamps: false
    });

    Language.associate = (models) => {
        Language.hasMany(models.WebText, {
            foreignKey: 'language_id',
            as: 'web_texts'
        });
    };

    return Language;
};
