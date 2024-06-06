const { poolPromise, sql } = require('../utils/poolPromise');


const handleLogout = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204); // No cookie, no session

  const refreshToken = cookies.jwt;
  try {
    // Connect to SQL Server
    const pool = await poolPromise; 


    // Check if refreshToken is in the database
    const result = await pool.request()
      .input('refreshToken', sql.NVarChar(255), refreshToken)
      .query('SELECT * FROM Users WHERE refreshToken = @refreshToken');

    if (!result.recordset || result.recordset.length === 0) {
      // If refreshToken is not found, clear the cookie and return 204
      res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
      return res.sendStatus(204);
    }

    // Since SQL Server does not have an ARRAY_REMOVE function and assuming refreshToken is a single value,
    // we directly set the refreshToken to NULL or an empty string to 'remove' it.
    await pool.request()
      .input('refreshToken', sql.NVarChar(255), refreshToken)
      .query('UPDATE Users SET refreshToken = NULL WHERE refreshToken = @refreshToken');

    // Clear the cookie and return 204
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  } 
};

module.exports = { handleLogout };
