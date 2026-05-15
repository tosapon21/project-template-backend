export default (sequelize, DataTypes) => {
    const Whitelist = sequelize.define('Whitelist', {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        token: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        token_type: {
            type: DataTypes.ENUM('access', 'refresh'),
            allowNull: false
        },
        expire_date: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        tableName: 'whitelist',
        timestamps: true,
        indexes: [
            { fields: ['user_id', 'token_type'] },
            { fields: ['expire_date'] }
        ]
    });

    Whitelist.associate = (models) => {
        Whitelist.belongsTo(models.User, { foreignKey: 'user_id' });
    };

    return Whitelist;
};
