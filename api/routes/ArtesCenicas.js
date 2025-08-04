const express = require('express');
const app = express();
const router = express.Router();
app.use(express.json());

const artesController = require('../controllers/ArtesCenicasController');

router.get('/create', artesController.createTodasArtes);
router.get('/', artesController.getTodasArtesUFPE);
router.get('/deleteAll', artesController.deleteAllArtes);


module.exports = router;
