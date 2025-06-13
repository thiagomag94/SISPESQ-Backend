

const express = require('express');
const app = express()
const router = express.Router();
app.use(express.json())

const livrosController = require('../controllers/livrosController') 


router.get('/', livrosController.getTodosLivrosUFPE)


module.exports = router
