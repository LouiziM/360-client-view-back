const express = require('express');
const router = express.Router();
const usersController = require('../../controllers/usersController');
const ROLES_LIST = require('../../config/roles_list');
const verifyJWT = require('../../middleware/verifyJWT')

router.route('/')
    .get(verifyJWT, usersController.getAllUsers)
    .delete(verifyJWT, usersController.deleteUser)
    .put(verifyJWT, usersController.updateUser);
router.route('/one')
    .get(verifyJWT,usersController.getUser);
router.route('/deactivate')
    .put( verifyJWT,usersController.deactivateUser);
router.route('/roles')
    .get(verifyJWT,usersController.getRoles);

module.exports = router;