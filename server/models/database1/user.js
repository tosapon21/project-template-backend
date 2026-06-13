export default (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        user_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },
        bp_portal_user_id: {
            type: DataTypes.STRING(100),
            unique: true
        },
        status: {
            type: DataTypes.TINYINT,
            defaultValue: 0
        },
        last_login: {
            type: DataTypes.DATE
        },
        profile_img_code: {
            type: DataTypes.STRING(255)
        },
        first_name: {
            type: DataTypes.STRING(100)
        },
        last_name: {
            type: DataTypes.STRING(100)
        },
        nick_name: {
            type: DataTypes.STRING(100)
        },
        failed_login_attempts: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        locked_until: {
            type: DataTypes.DATE
        }
    }, {
        tableName: 'users',
        timestamps: true
    });

    User.associate = (models) => {
        User.hasMany(models.UserRole, { foreignKey: 'user_id' });
        User.belongsToMany(models.Role, {
            through: models.UserRole,
            foreignKey: 'user_id',
            otherKey: 'role_id'
        });
        User.hasMany(models.Whitelist, { foreignKey: 'user_id' });
        User.hasMany(models.EmailVerification, { foreignKey: 'user_id' });
        User.hasMany(models.PasswordReset, { foreignKey: 'user_id' });
    };

    return User;
};
