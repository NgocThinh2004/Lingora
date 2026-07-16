require('dotenv').config();

const common = {
  dialect: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER || 'lingora_app',
  password: process.env.DB_PASSWORD || '',
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
};

module.exports = {
  development: { ...common, database: process.env.DB_NAME || 'lingora_dev' },
  test: { ...common, database: process.env.DB_TEST_NAME || 'lingora_test' },
  production: { ...common, database: process.env.DB_NAME },
};
