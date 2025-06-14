
const express = require('express');
const app = express()
const router = express.Router();
app.use(express.json())

const trabalhoEmEventosController = require('../controllers/trabalhoEmEventosController') 


router.get('/create', trabalhoEmEventosController.createTodosTrabalhosEmEventos)
router.get('/', trabalhoEmEventosController.getAllTrabalhosEmEventos)
router.get('/deleteAll', trabalhoEmEventosController.deleteAllTrabalhosEmEventos)

module.exports = router