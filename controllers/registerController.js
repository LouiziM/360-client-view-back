const sql = require('mssql');
const bcrypt = require('bcrypt');
const dbConfig = require('../config/dbConn'); 

const handleNewUser = async (req, res) => {
  const { user, pwd } = req.body;
  if (!user || !pwd) return res.status(400).json({ message: 'Username and password are required.' });

  try {
    // Connect to SQL Server
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    // Check for duplicate usernames in the database
    const resultDuplicate = await pool.request()
      .input('username', sql.VarChar, user)
      .query('SELECT * FROM Users WHERE username = @username');

    if (resultDuplicate.recordset && resultDuplicate.recordset.length > 0) {
      return res.sendStatus(409); // Conflict
    }

    // Encrypt the password
    const hashedPwd = await bcrypt.hash(pwd, 10);

    // Create and store the new user in the database
    const resultCreateUser = await pool.request()
      .input('username', sql.VarChar, user)
      .input('password', sql.VarChar, hashedPwd)
      .query('INSERT INTO Users (username, password) VALUES (@username, @password)');

    console.log(resultCreateUser);

    res.status(201).json({ success: `New user ${user} created!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    
    sql.close();
  }
};

module.exports = { handleNewUser };
