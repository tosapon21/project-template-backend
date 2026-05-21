export default (sequelize, DataTypes) => {
    const PasswordReset = sequelize.define('PasswordReset', {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        token_hash: {
            type: DataTypes.STRING(128),
            allowNull: false,
            unique: true
        },
        expire_date: {
            type: DataTypes.DATE,
            allowNull: false
        },
        used_at: {
            type: DataTypes.DATE
        }
    }, {
        tableName: 'password_resets',
        timestamps: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['token_hash'] },
            { fields: ['expire_date'] }
        ]
    });

    PasswordReset.associate = (models) => {
        PasswordReset.belongsTo(models.User, { foreignKey: 'user_id' });
    };

    return PasswordReset;
};
