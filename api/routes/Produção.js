const express = require('express');
const app = express()
const router = express.Router();
app.use(express.json())

const producaoGeralController = require('../controllers/producaoGeralController')

router.get('/create', producaoGeralController.ProducaoGeralcreate)
router.get('/', producaoGeralController.getProducaoGeral)


module.exports = router