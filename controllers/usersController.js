const sql = require('mssql');
const dbConfig = require('../config/dbConn'); 
const ROLES_LIST = require('../config/roles_list');
const bcrypt = require('bcrypt');
const {handleNewUser} = require('./registerController')

const getAllUsers = async (req, res) => {
  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request().query('SELECT * FROM Users');

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(400).json({ success: false, message: 'No users found' });
    }

   
    const users = result.recordset.map(user => ({
      ...user,
      password: '' 
    }));

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  } finally {
    sql.close();
  }
};

// Delete user from the Users table
const deleteUser = async (req, res) => {
  const userId = req?.body?.id;
  if (!userId) return res.status(400).json({ success: false, message: 'User ID required' });

  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('UPDATE Users SET active = 0 WHERE UserId = @userId; DELETE FROM Users WHERE UserId = @userId');

    if (result.rowsAffected[1] === 0) {
      return res.status(400).json({ success: false, message: `User ID ${userId} not found` });
    }

    res.status(200).json({ success: true, message: `User ID ${userId} deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  } finally {
    sql.close();
  }
};


// Fetch a single user from the Users table
const getUser = async (req, res) => {
  const userId = req?.body?.id; 

  if (!userId) return res.status(400).json({ success: false, message: 'User ID est obligatoire' });

  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
   
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM Users WHERE UserId = @userId');

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(400).json({ success: false, message: `User ID ${userId} not found` });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  } finally {
    sql.close();
  }
};

//update the user
const updateUser = async (req, res) => {
  const { id, username, pwd } = req.body;

  if (!id && (!username && !pwd)) {
    return res.status(400).json({ success: false, message: 'ID + (username, or password) are required for the update' });
  }

  let isNewUser = false; // Flag to check if a new user was created

  try {
    const newHashedPwd = pwd !== '*********' ? await bcrypt.hash(pwd, 10) : '*********';
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    let result; 

    if (newHashedPwd !== '*********') {
      result = await pool.request()
        .input('userId', sql.Int, id)
        .input('newUsername', sql.VarChar(255), username)
        .input('newPassword', sql.VarChar(255), newHashedPwd)
        .query('UPDATE Users SET username = @newUsername, password = @newPassword  WHERE UserId = @userId');
    } else {
      result = await pool.request()
        .input('userId', sql.Int, id)
        .input('newUsername', sql.VarChar(255), username)
        .query('UPDATE Users SET username = @newUsername, active = 1 WHERE UserId = @userId');
    }

    if (result.rowsAffected[0] === 0) {
      await handleNewUser(req, res);
      isNewUser = true;
    }

    // Only send a response if the user was updated, not for the new user case
    if (!isNewUser) {
      return res.status(200).json({ success: true, message: `User ID ${id} updated successfully` });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  } finally {
    sql.close();
  }
};



const deactivateUser = async (req, res) => {
  const { isActive, id } = req.body;

  if (!id || isActive === undefined) {
    return res.status(400).json({ success: false, message: 'User ID et isActive sont obligatoires' });
  }

  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    console.log(isActive)
    const result = await pool.request()
      .input('userId', sql.Int, id)
      .input('isActive', sql.Bit, isActive)
      .query('UPDATE Users SET active = @isActive WHERE UserId = @userId');

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ success: false, message: `User ID ${id} not found` });
    }

    res.status(200).json({ success: true, message: `User ID ${id} deactivated successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  } finally {
    sql.close();
  }
};





module.exports = {
  getAllUsers,
  deleteUser,
  getUser,
  updateUser,
  deactivateUser
};

