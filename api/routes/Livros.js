

const express = require('express');
const app = express()
const router = express.Router();
app.use(express.json())

const livrosController = require('../controllers/livrosController') 


router.get('/create', livrosController.createTodosLivros)
router.get('/', livrosController.getAllLivros)
router.get('/deleteAll', livrosController.deleteAllLivros)

module.exports = router
