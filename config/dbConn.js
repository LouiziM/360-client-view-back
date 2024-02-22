const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
     trustedconnection: process.env.DB_OPTIONS_TRUSTED_CONNECTION === 'true',
     enableArithAbort: process.env.DB_OPTIONS_ENABLE_ARITH_ABORT === 'true',
     instancename: process.env.DB_OPTIONS_INSTANCE_NAME,
    trustServerCertificate: false,
    encrypt:false,

  },
  port: parseInt(process.env.DB_PORT, 10)
};

module.exports = config;