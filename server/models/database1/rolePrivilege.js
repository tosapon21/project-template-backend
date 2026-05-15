export default (sequelize, DataTypes) => {
    const RolePrivilege = sequelize.define('RolePrivilege', {
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'roles', key: 'id' }
        },
        privilege_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'privileges', key: 'id' }
        }
    }, {
        tableName: 'role_privileges',
        timestamps: false
    });

    return RolePrivilege;
};
