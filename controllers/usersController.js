const sql = require('mssql');
const dbConfig = require('../config/dbConn'); // Ensure this points to your actual DB config
const ROLES_LIST = require('../config/roles_list');

// Fetch all users from the Users table
const getAllUsers = async (req, res) => {
  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request().query('SELECT * FROM Users');

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(204).json({ message: 'No users found' });
    }

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    sql.close();
  }
};

// Delete user from the Users table
const deleteUser = async (req, res) => {
  const userId = req?.body?.id;
  if (!userId) return res.status(400).json({ message: 'User ID required' });

  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('DELETE FROM Users WHERE UserId = @userId');

    if (result.rowsAffected[0] === 0) {
      return res.status(204).json({ message: `User ID ${userId} not found` });
    }

    res.json({ message: `User ID ${userId} deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    await pool.close();
  }
};

// Fetch a single user from the Users table
const getUser = async (req, res) => {
  const userId = req?.body?.id; 

  console.log(`User ID ${userId} `)
  if (!userId) return res.status(400).json({ message: 'User ID required' });

  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
   
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM Users WHERE UserId = @userId');

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(204).json({ message: `User ID ${userId} not found` });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    sql.close();
  }
};

module.exports = {
  getAllUsers,
  deleteUser,
  getUser,
};
