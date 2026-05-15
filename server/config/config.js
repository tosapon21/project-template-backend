require('dotenv').config();

module.exports = {
    database1: {
        username: process.env.DB1_USER,
        password: process.env.DB1_PASSWORD,
        database: process.env.DB1_NAME,
        host: process.env.DB1_HOST,
        port: process.env.DB1_PORT || 3306,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false
    },
    database2: {
        username: process.env.DB2_USER,
        password: process.env.DB2_PASSWORD,
        database: process.env.DB2_NAME,
        host: process.env.DB2_HOST,
        port: process.env.DB2_PORT || 3306,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false
    }
};
