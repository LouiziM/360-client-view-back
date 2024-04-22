const sql = require('mssql');
const bcrypt = require('bcrypt');
const dbConfig = require('../config/dbConn'); 

const handleNewUser = async (req, res) => {
  const { user, username, pwd, roles } = req.body;
  const actualUser = user || username;

  if (!actualUser || !pwd) return res.status(400).json({ success: false, message: 'Username and password are required.' });

  try { 
    // Connect to SQL Server
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    // Check for duplicate usernames in the database
    const resultDuplicate = await pool.request()
      .input('username', sql.VarChar, actualUser)
      .query('SELECT * FROM Users WHERE username = @username');

    if (resultDuplicate.recordset && resultDuplicate.recordset.length > 0) {
      return res.status(400).json({ success: false, message: "L'utilisateur est déjà créé."}); // Conflict
    }

    // Encrypt the password
    const hashedPwd = await bcrypt.hash(pwd, 10);

    // Create and store the new user in the database
    const resultCreateUser = await pool.request()
      .input('username', sql.VarChar, actualUser)
      .input('password', sql.VarChar, hashedPwd)
      .input('roles',sql.Int,roles)
      .input('creationDate', sql.DateTime2, new Date()) 
      .query('INSERT INTO Users (username, password,roles, creationDate) VALUES (@username, @password,@roles, @creationDate)');

    console.log("result",resultCreateUser);

    res.status(200).json({ success: true, message: `New user ${actualUser} created!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    
    sql.close();
  }
};

module.exports = { handleNewUser };
