const express = require('express');
const app = express()
const router = express.Router();
app.use(express.json())

const orientacoesController = require('../controllers/orientacoesController')

router.get('/:id_docente', orientacoesController.getOrientacoes)

module.exports = router