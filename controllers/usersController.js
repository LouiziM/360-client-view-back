const sql = require('mssql');
const dbConfig = require('../config/dbConn'); 
const ROLES_LIST = require('../config/roles_list');
const bcrypt = require('bcrypt');
const {handleNewUser} = require('./registerController')
const { hashPassword } = require('../utils/hashPassword');

const getAllUsers = async (req, res) => {
  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool
      .request()
      .query('SELECT * FROM Users WHERE roles != 1'); 

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
      .query('DELETE FROM Users WHERE UserId = @userId');

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
  const { id, username } = req.body;

  if (!id || !username) {
    return res.status(400).json({ success: false, message: 'Les champs Matricule et Id sont tous les deux requis' });
  }

  try {
    // Check if the new username is already taken
    const userExists = await checkIfUserExists(username);

    if (userExists) {
      return res.status(400).json({ success: false, message: 'Le nom d\'utilisateur est déjà utilisé par un autre utilisateur' });
    }

    const newPassword = username + '*+'; 
    const hashedPwd = await hashPassword(newPassword); 

    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request()
      .input('userId', sql.Int, id)
      .input('newUsername', sql.VarChar(255), username)
      .input('newPassword', sql.VarChar(255), hashedPwd)
      .query('UPDATE Users SET username = @newUsername, password = @newPassword WHERE UserId = @userId');

    if (result.rowsAffected[0] === 0) {
      await handleNewUser(req, res);
      return res.status(200).json({ success: true, message: 'Utilisateur ajouté avec succès' });
    }

    return res.status(200).json({ success: true, message: 'Utilisateur modifié avec succès' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  } finally {
    sql.close();
  }
};

// Function to check if a user with the given username already exists
const checkIfUserExists = async (username) => {
  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request()
      .input('username', sql.VarChar(255), username)
      .query('SELECT * FROM Users WHERE username = @username');

    return result.recordset.length > 0;
  } catch (err) {
    console.error(err);
    throw err; 
  } finally {
    sql.close();
  }
};





const deactivateUser = async (req, res) => {
  const { isActive, id } = req.body;
  console.log(isActive)
  if (!id || isActive === undefined) {
    return res.status(400).json({ success: false, message: 'User ID et isActive sont obligatoires' });
  }

  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    const result = await pool.request()
      .input('userId', sql.Int, id)
      .input('isActive', sql.Bit, isActive)
      .query('UPDATE Users SET active = @isActive WHERE UserId = @userId');

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ success: false, message: `L'utilisateur n'existe pas` });
    }

    if(!isActive)res.status(200).json({ success: true, message: `L'utilisateur a été désactivé avec succès.` });
    else if(isActive)res.status(200).json({ success: true, message: `L'utilisateur a été activé avec succès.` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  } finally {
    sql.close();
  }
};

const getRoles = async (req, res) => {
  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request().query('SELECT * FROM Roles');

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
    sql.close();
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

