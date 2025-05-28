

const express = require('express');
const app = express()
const router = express.Router();
app.use(express.json())
const lattesController = require('../controllers/LattesController')


router.get('/create', lattesController.createLattes)
router.get('/rawjson', lattesController.extrairTodosCurriculos)
router.get('/internal-id', lattesController.getInternalId)
router.get('/:id', lattesController.getLattesbyId)
router.get('/', lattesController.getLattes)


module.exports = router
