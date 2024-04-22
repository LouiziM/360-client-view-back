const sql = require('mssql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dbConfig = require('../config/dbConn');

const handleLogin = async (req, res) => {
  const cookies = req.cookies;
  const { user, pwd } = req.body;

  if (!user || !pwd) {
    return res.status(400).json({ message: "L'utilisateur et le mot de passe sont obligatoires." });
  }

  try {
    const pool = await sql.connect(dbConfig);

    const result = await pool.request()
      .input('username', sql.NVarChar(255), user)
      .query('SELECT * FROM [dbo].[Users] WHERE [username] = @username AND [active] = 1');

    const foundUser = result.recordset[0];
    if (!foundUser) return res.sendStatus(401); // Unauthorized

    // Evaluate password
    const match = await bcrypt.compare(pwd, foundUser.password);
    if (match) {
      const role = foundUser?.roles || 0; 

      const accessToken = jwt.sign(
        { "UserInfo": { "UserId": foundUser.UserId, "roles": role } }, 
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '500s' }
      );

      const options = {
        expires: new Date(Date.now() + parseInt(process.env.JWT_EXPIRES) * 60 * 60 * 1000)
        // expires: new Date(Date.now() + 10000) 
      }

      if (cookies?.jwt) {
        const refreshToken = cookies.jwt;
        const foundTokenResult = await pool.request()
          .input('refreshToken', sql.NVarChar(255), refreshToken)
          .query('SELECT * FROM Users WHERE refreshToken = @refreshToken');

        if (!foundTokenResult.recordset.length) {
          refreshTokenArray = [];
        }

        res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
      }

      // Update refreshToken for the current user
      await pool.request()
        .input('newRefreshToken', sql.NVarChar(255), newRefreshToken)
        .input('username', sql.NVarChar(255), user)
        .input('lastLogin', sql.DateTime2, new Date()) 
        .query('UPDATE Users SET refreshToken = @newRefreshToken, lastLogin = @lastLogin WHERE username = @username');

      // Create Secure Cookie with refresh token
      res.cookie('jwt', newRefreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 24 * 60 * 60 * 1000 });

      // Send authorization roles and access token to the user
      res.json({ accessToken });

    } else {
      return res.status(400).json({ success: false, message: "Nom d'utilisateur ou mot de passe incorrect." });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  } finally {
    sql.close();
  }
};


module.exports = { handleLogin };
