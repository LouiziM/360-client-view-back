const express = require('express');
const router = express.Router();
const clientsController = require('../controllers/clientsController');
const forceLogout = require('../middleware/forceLogout')

router.get('/', forceLogout, clientsController.getClients);
router.get('/completion/:id',forceLogout, clientsController.getCompletion);
router.get('/customer-count-by-region',forceLogout, clientsController.getCountByRegion);
router.get('/parc-client/:numClient', forceLogout, clientsController.getParcClient);
router.get('/passage-sav/:numClient', forceLogout, clientsController.getPassageSAV);
router.get('/satisfaction/:numClient', forceLogout, clientsController.getSatisfaction);

module.exports = router;