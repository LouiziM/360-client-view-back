const jwt = require('jsonwebtoken');
const { poolPromise, sql } = require('../utils/poolPromise');


const forceLogout = async (req, res, next) => {
    
    const token = req.cookies.jwt;

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
        if (err) return res.status(401).json({ type: 'UNAUTHORIZED', error: 'Ta session est expirée.' }); // Invalid token

        const userId = decoded.UserInfo.UserId; 

        try {
            const pool = await poolPromise; 
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .query('SELECT * FROM Users WHERE UserId = @userId');

            if (result.recordset.length === 0 || result.recordset[0].active == 0) {
                return res.status(401).json({ logged: 0 }); // User should be logged out
            }

            next(); // Continue to the next middleware
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Erreur interne du serveur' });
        } 
    });
};

module.exports = forceLogout;
