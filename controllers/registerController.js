const sql = require('mssql');
const { dbConfig } = require('../config/dbConn');
const { hashPassword } = require('../utils/hashPassword');

const handleNewUser = async (req, res) => {
  const { matricule, roles } = req.body;
  let pool;

  if (!matricule) {
    return res.status(400).json({ success: false, message: 'Le champ Matricule est nécessaire' });
  } else if (matricule?.length != 6) {
    return res.status(400).json({ success: false, message: 'Le champ Matricule est mal formé' });
  }
  try {
    // Connect to SQL Server
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    // Check for duplicate usernames in the database
    const resultDuplicate = await pool.request()
      .input('username', sql.VarChar(6), matricule)
      .query('SELECT * FROM Users WHERE username = @username');

    if (resultDuplicate.recordset && resultDuplicate?.recordset?.length > 0) {
      return res.status(400).json({ success: false, message: "L'utilisateur existe déjà ." }); // Conflict
    }

    // Encrypt the password
    const hashedPwd = await hashPassword(matricule + '*+');

    // Create and store the new user in the database
    await pool.request()
      .input('username', sql.VarChar(6), matricule)
      .input('password', sql.NVarChar(255), hashedPwd)
      .input('roles', sql.Int, roles)
      .query('INSERT INTO Users (username, password,roles, creationDate, active) VALUES (@username, @password,@roles,GETDATE(), 1)');

    res.status(200).json({ success: true, message: `L'utilisateur ${matricule} a été créé avec succès !` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur interne du serveur" });
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};

module.exports = { handleNewUser };
