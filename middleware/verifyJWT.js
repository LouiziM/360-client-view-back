const jwt = require('jsonwebtoken');
const ROLES_LIST = require('../config/roles_list');

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.sendStatus(401);

    const token = authHeader.split(' ')[1];
    console.log(token);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) return res.sendStatus(403); // Invalid token

        req.UserId = decoded.UserInfo.UserId;
        req.role = decoded.UserInfo.roles;

        // Check if the user has the required role (Admin)
        if (req.role === ROLES_LIST.Admin) {
            next();
        } else {
            res.sendStatus(403);
        }
    });
};

module.exports = verifyJWT;
