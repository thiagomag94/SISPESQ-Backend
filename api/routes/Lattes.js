

const express = require('express');
const app = express()
const router = express.Router();
app.use(express.json())
const lattesController = require('../controllers/LattesController')


router.get('/', lattesController.getLattes)
router.get('/:id', lattesController.getLattesbyId)

module.exports = router
