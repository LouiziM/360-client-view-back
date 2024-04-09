const express = require('express');
const router = express.Router();
const clientsController = require('../controllers/clientsController');
const forceLogout = require('../middleware/forceLogout')

router.get('/', forceLogout,clientsController.getClients);
router.get('/completion/:id',forceLogout, clientsController.getCompletion);
router.get('/customer-count-by-region',forceLogout, clientsController.getCountByRegion);

module.exports = router;