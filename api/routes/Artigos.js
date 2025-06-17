const express = require('express');
const app = express();
const router = express.Router();
app.use(express.json());

const artigosController = require('../controllers/artigosController');

router.get('/create', artigosController.createTodosArtigos);
router.get('/', artigosController.getTodosArtigosUFPE);
router.get('/deleteAll', artigosController.deleteAllArtigos);
router.get('/getByDepartamentoouCentro', artigosController.getArtigosPorDepartamentoouCentro);
router.get('/buscarPorPalavrasChave', artigosController.buscarPorPalavrasChave);

module.exports = router;
