const { poolPromise, sql } = require('../utils/poolPromise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const handleLogin = async (req, res) => {
  const { user, pwd } = req.body;

  if (!user || !pwd) {
    return res.status(400).json({ status: false, message: "L'utilisateur et le mot de passe sont obligatoires." });
  }

  try {
    const pool = await poolPromise; 


    const result = await pool.request()
      .input('username', sql.VarChar(255), user)
      .query('SELECT * FROM [dbo].[Users] WHERE [username] = @username AND [active] = 1');

    const foundUser = result.recordset[0];
    if (!foundUser) return res.status(400).json({ status: false, message: "Cet utilisateur est désactivé." });

    // Evaluate password
    const match = await bcrypt.compare(pwd, foundUser.password);
    if (match) {
      const role = foundUser?.roles || 0;

      const options = {
        expires: new Date(Date.now() + parseInt(process.env.JWT_EXPIRES) * 60 * 60 * 1000)
      }
      await pool.request()
        .input('username', sql.VarChar(255), user)
        .query('UPDATE Users SET  lastLogin = GETDATE() WHERE username = @username');
      const accessToken = jwt.sign({ "UserInfo": { "UserId": foundUser.UserId, "roles": role } }, process.env.ACCESS_TOKEN_SECRET);
      return res.status(200).cookie('jwt', accessToken, options).json({
        accessToken,
        user: {
          UserId: foundUser?.UserId,
          active: foundUser?.active,
          lastLogin: foundUser?.lastLogin,
          creationDate: foundUser?.creationDate,
          roles: foundUser?.roles,
          username: foundUser?.username
        }
      });
    } else {
      return res.status(400).json({ success: false, message: "Nom d'utilisateur ou mot de passe incorrect." });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  } 
};


module.exports = { handleLogin };
