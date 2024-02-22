const express = require('express');
const router = express.Router();
const registerController = require('../controllers/registerController');

//should add verifyJWT
router.post('/', registerController.handleNewUser);

module.exports = router;