import Sequelize from 'sequelize';
import config from '../config/config.js';

import User from './database1/user.js';
import Role from './database1/role.js';
import Privilege from './database1/privilege.js';
import UserRole from './database1/userRole.js';
import RolePrivilege from './database1/rolePrivilege.js';
import Whitelist from './database1/whitelist.js';
import EmailVerification from './database1/emailVerification.js';
import PasswordReset from './database1/passwordReset.js';

const sequelize1 = new Sequelize(
    config.database1.database,
    config.database1.username,
    config.database1.password,
    {
        host: config.database1.host,
        port: config.database1.port,
        dialect: config.database1.dialect,
        logging: config.database1.logging
    }
);

const sequelize2 = new Sequelize(
    config.database2.database,
    config.database2.username,
    config.database2.password,
    {
        host: config.database2.host,
        port: config.database2.port,
        dialect: config.database2.dialect,
        logging: config.database2.logging
    }
);

// Init DB1 models
const db1Models = {
    User: User(sequelize1, Sequelize),
    Role: Role(sequelize1, Sequelize),
    Privilege: Privilege(sequelize1, Sequelize),
    UserRole: UserRole(sequelize1, Sequelize),
    RolePrivilege: RolePrivilege(sequelize1, Sequelize),
    Whitelist: Whitelist(sequelize1, Sequelize),
    EmailVerification: EmailVerification(sequelize1, Sequelize),
    PasswordReset: PasswordReset(sequelize1, Sequelize),
};

// Run associations
Object.values(db1Models).forEach(model => {
    if (model.associate) model.associate(db1Models);
});

// DB2 models (add yours here as the project grows)
const db2Models = {};

export default {
    database1: db1Models,
    database2: db2Models,
    sequelize1,
    sequelize2,
    Sequelize
};
