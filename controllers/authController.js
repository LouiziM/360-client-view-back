const sql = require('mssql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dbConfig = require('../config/dbConn');

const handleLogin = async (req, res) => {
  const { user, pwd } = req.body;

  if (!user || !pwd) {
    return res.status(400).json({ 'message': 'Username and password are required.' });
  }

  try {
    const pool = await sql.connect(dbConfig);

    const result = await pool.request()
      .input('username', sql.NVarChar(255), user)
      .query('SELECT * FROM [dbo].[Users] WHERE [username] = @username AND [active] = 1');

    const foundUser = result.recordset[0];
    if (!foundUser) return res.status(400).json({
      success: false,
      message: "L'utilisateur n'est pas active"
    });

    // Evaluate password
    const match = await bcrypt.compare(pwd, foundUser.password);
    if (match) {
      const role = foundUser?.roles || 0;

      const accessToken = jwt.sign(
        { "UserInfo": { "UserId": foundUser.UserId, "roles": role } },
        process.env.ACCESS_TOKEN_SECRET
      );

      const options = {
        expires: new Date(Date.now() + parseInt(process.env.JWT_EXPIRES) * 60 * 60 * 1000)
        // expires: new Date(Date.now() + 20000) 
      }

      // Create Secure Cookie
      res.cookie('jwt', accessToken, options);

      // Send authorization roles and access token to the user
      return res.status(200).json({ accessToken });

    } else {
      return res.status(400).json({ success: false, message: "Nom d'utilisateur ou mot de passe incorrect" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  } finally {
    sql.close();
  }
};


module.exports = { handleLogin };
