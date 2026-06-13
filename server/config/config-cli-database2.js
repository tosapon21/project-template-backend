require('dotenv').config();

const dbLogging = process.env.DB_LOGGING === 'true' ? console.log : false;

module.exports = {
  development: {
    username: process.env.DB2_USER || 'root',
    password: process.env.DB2_PASSWORD || null,
    database: process.env.DB2_NAME || 'database2_dev',
    host: process.env.DB2_HOST || '127.0.0.1',
    port: process.env.DB2_PORT || 3306,
    dialect: 'mysql',
    logging: dbLogging
  },
  test: {
    username: process.env.DB2_USER || 'root',
    password: process.env.DB2_PASSWORD || null,
    database: process.env.DB2_NAME || 'database2_test',
    host: process.env.DB2_HOST || '127.0.0.1',
    port: process.env.DB2_PORT || 3306,
    dialect: 'mysql',
    logging: false
  },
  production: {
    username: process.env.DB2_USER,
    password: process.env.DB2_PASSWORD,
    database: process.env.DB2_NAME,
    host: process.env.DB2_HOST,
    port: process.env.DB2_PORT || 3306,
    dialect: 'mysql',
    logging: false
  }
};
