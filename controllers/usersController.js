const sql = require('mssql');
const {dbConfig} = require('../config/dbConn');
const ROLES_LIST = require('../config/roles_list');
const bcrypt = require('bcrypt');
const { handleNewUser } = require('./registerController')
const { hashPassword } = require('../utils/hashPassword');

const getAllUsers = async (req, res) => {
  let pool;
  try {
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool
      .request()
      .query(`
        SELECT U.UserId AS id, U.*, R.role
        FROM Users U
        JOIN Roles R ON U.roles = R.role_id
        WHERE R.role != 'Administrateur'
      `);

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
    if (pool) {
      await pool.close();
    }
  }
};



// Delete user from the Users table
const deleteUser = async (req, res) => {
  const userId = req?.body?.id;
  let pool;

  if (!userId) return res.status(400).json({ success: false, message: 'User ID required' });

  try {
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('DELETE FROM Users WHERE UserId = @userId');

    if (result.rowsAffected[1] === 0) {
      return res.status(400).json({ success: false, message: `User ID ${userId} not found` });
    }

    res.status(200).json({ success: true, message: `User ID ${userId} deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};


// Fetch a single user from the Users table
const getUser = async (req, res) => {
  const userId = req?.body?.id;
  let pool;

  if (!userId) return res.status(400).json({ success: false, message: 'User ID est obligatoire' });

  try {
    pool = new sql.ConnectionPool(dbConfig);
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
    if (pool) {
      await pool.close();
    }
  }
};


// Update the user
const updateUser = async (req, res) => {
  const { id, matricule, roles } = req.body;
  let pool;

  if (!id || !matricule) {
    return res.status(400).json({ success: false, message: 'Les champs Matricule et Id sont tous les deux requis' });
  }

  try {
    // Check if the provided username corresponds to the UserId
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request()
      .input('userId', sql.Int, id)
      .input('username', sql.VarChar(6), matricule)
      .query('SELECT * FROM Users WHERE UserId = @userId AND username = @username');

    if (!result?.recordset || result?.recordset?.length === 0) {
      // The provided username does not correspond to the UserId, check if it already exists
      const userExists = await checkIfUserExists(matricule);

      if (userExists) {
        return res.status(400).json({ success: false, message: 'Ce matricule est déjà utilisé par un autre utilisateur' });
      }

      if (roles !== 1 && roles !== 2) {
        return res.status(400).json({ success: false, message: 'Les rôles doivent être soit 1 soit 2' });
      }

      // Update username and roles
      await pool.request()
        .input('userId', sql.Int, id)
        .input('newUsername', sql.VarChar(6), matricule)
        .input('newRoles', sql.Int, roles)
        .query('UPDATE Users SET username = @newUsername, roles = @newRoles WHERE UserId = @userId');
    } else {
      // The provided username corresponds to the UserId, update only roles
      await pool.request()
        .input('userId', sql.Int, id)
        .input('newRoles', sql.Int, roles)
        .query('UPDATE Users SET roles = @newRoles WHERE UserId = @userId');
    }

    return res.status(200).json({ success: true, message: 'Utilisateur modifié avec succès' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};


// Function to check if a user with the given username already exists
const checkIfUserExists = async (username) => {
  let pool;

  try {
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request()
      .input('username', sql.VarChar(6), username)
      .query('SELECT * FROM Users WHERE username = @username');

    return result.recordset.length > 0;
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};





const deactivateUser = async (req, res) => {
  const { isActive, id } = req.body;
  let pool;

  if (!id || isActive === undefined) {
    return res.status(400).json({ success: false, message: 'User ID et isActive sont obligatoires' });
  }

  try {
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    const result = await pool.request()
      .input('userId', sql.Int, id)
      .input('isActive', sql.Bit, isActive)
      .query('UPDATE Users SET active = @isActive WHERE UserId = @userId');

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ success: false, message: `L'utilisateur n'existe pas` });
    }

    if (!isActive) res.status(200).json({ success: true, message: `L'utilisateur a été désactivé avec succès.` });
    else if (isActive) res.status(200).json({ success: true, message: `L'utilisateur a été activé avec succès.` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};

const getRoles = async (req, res) => {
  let pool;

  try {
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request().query('SELECT * FROM Roles WHERE role_id != 1');

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun role sur la Base de Données' });
    }

    const roles = result.recordset.map(role => ({
      roleId: role.role_id,
      roleName: role.role
    }));

    res.json(roles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};



module.exports = {
  getAllUsers,
  deleteUser,
  getUser,
  updateUser,
  deactivateUser,
  getRoles
};

