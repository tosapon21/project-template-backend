require('dotenv').config();

const dbLogging = process.env.DB_LOGGING === 'true' ? console.log : false;

module.exports = {
  development: {
    username: process.env.DB1_USER || 'root',
    password: process.env.DB1_PASSWORD || null,
    database: process.env.DB1_NAME || 'database1_dev',
    host: process.env.DB1_HOST || '127.0.0.1',
    port: process.env.DB1_PORT || 3306,
    dialect: 'mysql',
    logging: dbLogging
  },
  test: {
    username: process.env.DB1_USER || 'root',
    password: process.env.DB1_PASSWORD || null,
    database: process.env.DB1_NAME || 'database1_test',
    host: process.env.DB1_HOST || '127.0.0.1',
    port: process.env.DB1_PORT || 3306,
    dialect: 'mysql',
    logging: false
  },
  production: {
    username: process.env.DB1_USER,
    password: process.env.DB1_PASSWORD,
    database: process.env.DB1_NAME,
    host: process.env.DB1_HOST,
    port: process.env.DB1_PORT || 3306,
    dialect: 'mysql',
    logging: false
  }
};
