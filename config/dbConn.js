const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    trustServerCertificate: false,
    encrypt: false,
  },

  //port: parseInt(process.env.DB_PORT, 10)
};

module.exports = config;