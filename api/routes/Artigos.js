const express = require('express');
const app = express();
const router = express.Router();
app.use(express.json());

const artigosController = require('../controllers/artigosController');

router.get('/create', artigosController.createTodosArtigos);
router.get('/', artigosController.getTodosArtigosUFPE);
router.get('/delete', artigosController.deleteAllArtigos);

module.exports = router;
