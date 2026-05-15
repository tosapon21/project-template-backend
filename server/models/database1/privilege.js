export default (sequelize, DataTypes) => {
    const Privilege = sequelize.define('Privilege', {
        type: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        privilege_code: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        description: {
            type: DataTypes.STRING(255)
        }
    }, {
        tableName: 'privileges',
        timestamps: false
    });

    Privilege.associate = (models) => {
        Privilege.belongsToMany(models.Role, { through: models.RolePrivilege, foreignKey: 'privilege_id' });
    };

    return Privilege;
};
