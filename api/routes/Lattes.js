const router = express.Router();

const express = require('express');
const app = express()
const lattesController = require('../controllers/LattesController')



router.get('/', lattesController.getLattes)
module.exports = router