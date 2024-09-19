const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    trustServerCertificate: false,
    encrypt: false
  }
};

const configObject = {
  user: process.env.DB_USER_OBJECT,
  password: process.env.DB_PASSWORD_OBJECT,
  server: process.env.DB_SERVER_OBJECT,
  database: process.env.DB_NAME_OBJECT,
  options: {
    trustServerCertificate: false,
    encrypt: false
  }
};

module.exports = { dbConfig, configObject };