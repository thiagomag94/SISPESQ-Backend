const express = require('express');
const app = express();
const router = express.Router();
app.use(express.json());

const PartiturasController = require('../controllers/PartiturasController');
router.get('/create',PartiturasController.createTodasPartituras);
router.get('/', PartiturasController.getTodasPartituras);
router.get('/deleteAll', PartiturasController.deleteAllPartituras);

module.exports = router;
