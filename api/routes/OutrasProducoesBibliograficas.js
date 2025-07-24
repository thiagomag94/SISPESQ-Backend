const express = require('express');
const app = express();
const router = express.Router();
app.use(express.json());

const outrasProducoesBibliograficasController = require('../controllers/OutrasProducoesBibliograficasController');

router.get('/create', outrasProducoesBibliograficasController.createTodasOutrasProducoesBibliograficas);
router.get('/', outrasProducoesBibliograficasController.getTodasOutrasProducoesBibliograficas);
router.get('/deleteAll', outrasProducoesBibliograficasController.deleteAllOutrasProducoesBibliograficas);
module.exports = router;
