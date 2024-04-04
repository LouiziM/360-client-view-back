const express = require('express');
const router = express.Router();
const registerController = require('../controllers/registerController');
const verifyJWT = require('../middleware/verifyJWT')

//should add back verifyJWT
router.post('/', verifyJWT,registerController.handleNewUser);

module.exports = router;