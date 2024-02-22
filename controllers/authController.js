const sql = require('mssql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dbConfig = require('../config/dbConn');

const handleLogin = async (req, res) => {
  const cookies = req.cookies;
  const { user, pwd } = req.body;

  if (!user || !pwd) {
    return res.status(400).json({ 'message': 'Username and password are required.' });
  }

  try {
    const pool = await sql.connect(dbConfig);

    // Query for user by username
    const result = await pool.request()
      .input('username', sql.NVarChar(255), user)
      .query('SELECT * FROM [360_DB].[dbo].[Users] WHERE [username] = @username');

    const foundUser = result.recordset[0];
    if (!foundUser) return res.sendStatus(401); // Unauthorized

    // Evaluate password
    const match = await bcrypt.compare(pwd, foundUser.password);
    if (match) {
      const role = foundUser?.roles || 0; // Assuming roles is an integer

      const accessToken = jwt.sign(
        { "UserInfo": { "username": foundUser.username, "roles": role } }, // Keep as is (no conversion to array)
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '500s' }
      );

      const newRefreshToken = jwt.sign(
        { "username": foundUser.username },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '604800s' }
      );
      let refreshTokenArray = [];

      if (foundUser.refreshToken) {
        if (Array.isArray(foundUser.refreshToken)) {
          refreshTokenArray = foundUser.refreshToken.filter(rt => rt !== cookies?.jwt);
        } else {
          refreshTokenArray.push(foundUser.refreshToken !== cookies?.jwt ? foundUser.refreshToken : null);
        }
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
        .query('UPDATE Users SET refreshToken = @newRefreshToken WHERE username = @username');

      // Create Secure Cookie with refresh token
      res.cookie('jwt', newRefreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 24 * 60 * 60 * 1000 });

      // Send authorization roles and access token to the user
      res.json({ accessToken });

    } else {
      res.sendStatus(401); // Unauthorized
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  } finally {
    sql.close();
  }
};

module.exports = { handleLogin };
