const express = require('express');
const router = express.Router();
const artigosController = require('../controllers/artigosController');


router.get('/', artigosController.getArtigosUnicosUFPE);

// DEIXE AS OUTRAS ROTAS SEM COMENTÁRIOS POR ENQUANTO
router.get('/Qualis', artigosController.artigosComQualis);
router.get('/Qualis/Unicos', artigosController.getArtigosUnicosQualis);
router.get('/Qualis/Departamentos', artigosController.getArtigosUnicosQualisDepartamento);
router.get('/getByDepartamentoouCentro', artigosController.getArtigosPorDepartamentoouCentro);
router.get('/buscarPorPalavrasChave', artigosController.buscarPorPalavrasChave);
router.get('/exportExcel', artigosController.exportExcelArtigos);
router.get('/UFPE/create', artigosController.createArtigosUnicosUFPE);
router.get('/Departamento/create', artigosController.createArtigosUnicosDepartamento);
router.get('/deleteAll', artigosController.deleteAllArtigos);

module.exports = router;