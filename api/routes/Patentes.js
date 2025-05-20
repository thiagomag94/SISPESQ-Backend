const express = require('express');
const app = express()
const router = express.Router();
app.use(express.json())

const patentesController = require('../controllers/patentesController')

router.get('/:id_docente', patentesController.getPatentes)

module.exports = router
    