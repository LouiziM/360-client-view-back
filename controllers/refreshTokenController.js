const sql = require('mssql');
const jwt = require('jsonwebtoken');
const connectDB = require('../config/dbConn');

const handleRefreshToken = async (req, res) => {
  const cookies = req.cookies;
  console.log("reaches here")
  if (!cookies?.jwt) return res.sendStatus(401);

  const refreshToken = cookies.jwt;
  res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });

  try {
    // Connect to SQL Server
    const pool = new sql.ConnectionPool(connectDB);
    await pool.connect();

    // Check if refreshToken is in the database
    const result = await pool.request()
      .input('refreshToken', sql.NVarChar(255), refreshToken)
      .query('SELECT * FROM Users WHERE refreshToken = @refreshToken');

    // Detected refresh token reuse!
    if (!result.recordset || result.recordset.length === 0) {
      jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        async (err, decoded) => {
          if (err) return res.sendStatus(403); // Forbidden

          // Delete refresh tokens of hacked user
          await pool.request()
            .input('username', sql.NVarChar(255), decoded.username)
            .query('UPDATE Users SET refreshToken = NULL WHERE username = @username');
        }
      );
      return res.sendStatus(403); // Forbidden
    }

    // Get user details from the database
    const foundUser = result.recordset[0];
    console.log(foundUser)
    // Check if refreshToken is an array
    const newRefreshTokenArray = Array.isArray(foundUser.refreshToken)
      ? foundUser.refreshToken.filter(rt => rt !== refreshToken)
      : [];

    // Evaluate jwt
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, decoded) => {
        if (err) {
          // Expired refresh token
          await pool.request()
            .input('username', sql.NVarChar(255), decoded.username)
            .input('refreshToken', sql.NVarChar(255), refreshToken)
            .query('UPDATE Users SET refreshToken = NULL WHERE username = @username');
        }
        if (err || foundUser.username !== decoded.username) return res.sendStatus(403);

        // Refresh token was still valid
        const role = foundUser?.roles || 0; // Assuming roles is an integer

        const accessToken = jwt.sign(
          {
            UserInfo: {
              username: decoded.username,
              roles: role // Keep as is (no conversion to array)
            }
          },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: '500s' }
        );

        const newRefreshToken = jwt.sign(
          { username: foundUser.username },
          process.env.REFRESH_TOKEN_SECRET,
          { expiresIn: '604800s' }
        );

        // Saving refreshToken with the current user
        await pool.request()
          .input('username', sql.NVarChar(255), decoded.username)
          .input('newRefreshToken', sql.NVarChar(255), newRefreshToken)
          .query('UPDATE Users SET refreshToken = @newRefreshToken WHERE username = @username');

        // Creates Secure Cookie with refresh token
        res.cookie('jwt', newRefreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 24 * 60 * 60 * 1000 });

        res.json({ accessToken });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  } finally {
    sql.close();
  }
};

module.exports = { handleRefreshToken };
