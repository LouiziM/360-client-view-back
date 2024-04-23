const jwt = require('jsonwebtoken');
const ROLES_LIST = require('../config/roles_list');

const verifyJWT = (req, res, next) => {

    const token = req.cookies.jwt;

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ type: 'UNAUTHORIZED', error: 'Ta session est expirée.' });

        req.UserId = decoded.UserInfo.UserId;
        req.role = decoded.UserInfo.roles;

        // Check if the user has the required role (Admin)
        if (req.role === ROLES_LIST.Admin) {
            next();
        } else {
            res.status(403).json({ type: 'UNAUTHORIZED', error: "Vous n'avez pas le droit à accéder à cette ressource." });
        }
    });
};

module.exports = verifyJWT;
