export default (sequelize, DataTypes) => {
    const Role = sequelize.define('Role', {
        role_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        description: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    }, {
        tableName: 'roles',
        timestamps: false
    });

    Role.associate = (models) => {
        Role.belongsToMany(models.User, {
            through: models.UserRole,
            foreignKey: 'role_id',
            otherKey: 'user_id'
        });
        Role.belongsToMany(models.Privilege, {
            through: models.RolePrivilege,
            foreignKey: 'role_id',
            otherKey: 'privilege_id'
        });
    };

    return Role;
};
