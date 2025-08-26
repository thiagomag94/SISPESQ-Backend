

const express = require('express');
const router = express.Router();
const artigosController = require('../controllers/artigosController');


router.get('/', artigosController.getTodosArtigosUFPE);

// DEIXE AS OUTRAS ROTAS SEM COMENTÁRIOS POR ENQUANTO
router.get('/Qualis', artigosController.artigosComQualis);
router.get('/getByDepartamentoouCentro', artigosController.getArtigosPorDepartamentoouCentro);
router.get('/buscarPorPalavrasChave', artigosController.buscarPorPalavrasChave);
router.get('/exportExcel', artigosController.exportExcelArtigos);
router.get('/create', artigosController.createTodosArtigos);
router.get('/deleteAll', artigosController.deleteAllArtigos);

module.exports = router;