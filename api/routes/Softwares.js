const express = require('express');
const app = express()
const router = express.Router();
app.use(express.json())

const softwaresController = require('../controllers/softwaresController')

router.get('/:id_docente', softwaresController.getSoftwares)

module.exports = router