const express = require('express');
const router = express.Router();
const usersController = require('../../controllers/usersController');
const ROLES_LIST = require('../../config/roles_list');
const verifyJWT = require('../../middleware/verifyJWT')

router.route('/').get(usersController.getAllUsers)
router.route('/update').put(verifyJWT, usersController.updateUser);
router.route('/deactivate').put( verifyJWT,usersController.deactivateUser);
router.route('/roles').get(verifyJWT,usersController.getRoles);

module.exports = router;