const jwt = require('jsonwebtoken');
const ROLES_LIST = require('../config/roles_list');

const verifyJWT = (req, res, next) => {

    const token = req.cookies.jwt;
    if (!token) {
        return res.status(401).json({ type: 'UNAUTHORIZED', error: `Merci de se connecter pour continuer` });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) return res.sendStatus(403); // Invalid token

        req.UserId = decoded.UserInfo.UserId;
        req.role = decoded.UserInfo.roles;

        // Check if the user has the required role (Admin)
        if (req.role === ROLES_LIST.Admin) {
            next();
        } else {
            res.status(400).json({
                success: false,
                message: "Tu n'es pas autorisé"
            });
        }
    });
};

module.exports = verifyJWT;
