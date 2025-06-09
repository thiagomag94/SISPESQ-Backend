const express = require('express');
const app = express()
const router = express.Router();
app.use(express.json())

const artigosController = require('../controllers/artigosController')


router.get('/', artigosController.getTodosArtigosUFPE)

module.exports = router
