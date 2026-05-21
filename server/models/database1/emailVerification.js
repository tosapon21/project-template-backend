export default (sequelize, DataTypes) => {
    const EmailVerification = sequelize.define('EmailVerification', {
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
        tableName: 'email_verifications',
        timestamps: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['token_hash'] },
            { fields: ['expire_date'] }
        ]
    });

    EmailVerification.associate = (models) => {
        EmailVerification.belongsTo(models.User, { foreignKey: 'user_id' });
    };

    return EmailVerification;
};
