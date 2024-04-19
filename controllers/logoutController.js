const sql = require('mssql');
const dbConfig = require('../config/dbConn');

const handleLogout = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.status(400).json({
    success: false,
    message: "L'utilisateur est déconnecté"
  }); // No cookie, no session

  try {
    // Clear the cookie and return 204
    res.clearCookie('jwt');
    res.status(200).json({
      success: true,
      message: "L'utilisateur est déconnecté avec succès"
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  } finally {
    sql.close();
  }
};

module.exports = { handleLogout };
