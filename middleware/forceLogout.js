const jwt = require('jsonwebtoken');
const sql = require('mssql');
const dbConfig = require('../config/dbConn');

const forceLogout = async (req, res, next) => {
    
    const token = req.cookies.jwt;

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
        if (err) return res.status(401).json({ type: 'UNAUTHORIZED', error: 'Ta session est expirée.' }); // Invalid token

        const userId = decoded.UserInfo.UserId; 

        try {
            const pool = await sql.connect(dbConfig);
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
        } finally {
            sql.close();
        }
    });
};

module.exports = forceLogout;
