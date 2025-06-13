
const express = require('express');
const app = express()
const router = express.Router();
app.use(express.json())

const trabalhoEmEventosController = require('../controllers/trabalhoEmEventosController') 


router.get('/', trabalhoEmEventosController.getTodosTrabalhosEmEventos)


module.exports = router