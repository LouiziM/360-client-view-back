const bcrypt = require('bcrypt');
const { hashPassword } = require('../utils/hashPassword');
const { poolPromise, sql } = require('../utils/poolPromise');


const handleNewUser = async (req, res) => {
  const { user, username, roles } = req.body;
  const actualUser = user || username;

  if (!actualUser) {
    return res.status(400).json({ success: false, message: 'Le champ Matricule est nécessaire' });
  } else if (actualUser.length != 6) {
    return res.status(400).json({ success: false, message: 'Le champ Matricule est mal formé' });
  }
  try {
    // Connect to SQL Server
    const pool = await poolPromise; 


    // Check for duplicate usernames in the database
    const resultDuplicate = await pool.request()
      .input('username', sql.VarChar(255), actualUser)
      .query('SELECT * FROM Users WHERE username = @username');

    if (resultDuplicate.recordset && resultDuplicate.recordset.length > 0) {
      console.log("hell yeah")
      return res.status(400).json({ success: false, message: "L'utilisateur éxiste déjà ." }); // Conflict
    }

    // Encrypt the password
    const newPassword = actualUser + '*+';
    const hashedPwd = await hashPassword(newPassword);

    // Create and store the new user in the database
    const resultCreateUser = await pool.request()
      .input('username', sql.VarChar(255), actualUser)
      .input('password', sql.VarChar, hashedPwd)
      .input('roles', sql.Int, roles)
      .query('INSERT INTO Users (username, password,roles, creationDate) VALUES (@username, @password,@roles,GETDATE())');

    res.status(200).json({ success: true, message: `L'utilisateur ${actualUser} a été créé avec succès !` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  } 
};

module.exports = { handleNewUser };
