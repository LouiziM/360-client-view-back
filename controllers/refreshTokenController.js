const sql = require('mssql');
const jwt = require('jsonwebtoken');
const connectDB = require('../config/dbConn');

const handleRefreshToken = async (req, res) => {
  const cookies = req.cookies;
  console.log("reaches here")
  if (!cookies?.jwt) return res.sendStatus(401);
  console.log("reaches here2")

  const refreshToken = cookies.jwt;
  res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
  console.log("reaches here3")

  try {
    // Connect to SQL Server
    const pool = new sql.ConnectionPool(connectDB);
    console.log("reaches here4")

    await pool.connect();
    console.log("reaches here5")

    // Check if refreshToken is in the database
    const result = await pool.request()
      .input('refreshToken', sql.NVarChar(255), refreshToken)
      .query('SELECT * FROM Users WHERE refreshToken = @refreshToken');
      console.log("reaches here6")

    // Detected refresh token reuse!
    if (!result.recordset || result.recordset.length === 0) {
      jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        async (err, decoded) => {
          console.log("reaches here7")

          if (err) return res.sendStatus(403); // Forbidden
          console.log("reaches here8")

          // Delete refresh tokens of hacked user
          await pool.request()
            .input('UserId', sql.Int, decoded.UserId)
            .query('UPDATE Users SET refreshToken = NULL WHERE UserId = @UserId');
        }
      );
      return res.sendStatus(403); // Forbidden
    }
    console.log("reaches here9")

    // Get user details from the database
    const foundUser = result.recordset[0];
    console.log(foundUser)
    // Check if refreshToken is an array
    const newRefreshTokenArray = Array.isArray(foundUser.refreshToken)
      ? foundUser.refreshToken.filter(rt => rt !== refreshToken)
      : [];
      console.log("reaches here10")

    // Evaluate jwt
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, decoded) => {
        if (err) {
          // Expired refresh token
          await pool.request()
            .input('UserId', sql.Int, decoded.UserId)
            .input('refreshToken', sql.NVarChar(255), refreshToken)
            .query('UPDATE Users SET refreshToken = NULL WHERE UserId = @UserId');
            console.log("reaches here11")

        }
        if (err || foundUser.UserId !== decoded.UserId) return res.sendStatus(403);
        console.log(decoded.UserId)
        console.log("reaches here12")

        // Refresh token was still valid
        const role = foundUser?.roles || 0; 

        const accessToken = jwt.sign(
          {
            UserInfo: {
              UserId: decoded.UserId,
              roles: role 
            }
          },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: '500s' }
        );

        const newRefreshToken = jwt.sign(
          { UserId: foundUser.UserId },
          process.env.REFRESH_TOKEN_SECRET,
          { expiresIn: '604800s' }
        );

        // Saving refreshToken with the current user
        await pool.request()
          .input('UserId', sql.Int, decoded.UserId)
          .input('newRefreshToken', sql.NVarChar(255), newRefreshToken)
          .query('UPDATE Users SET refreshToken = @newRefreshToken WHERE UserId = @UserId');
          console.log("reaches here13")

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
