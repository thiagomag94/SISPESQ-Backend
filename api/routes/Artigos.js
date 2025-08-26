// Substitua o conteúdo de routes/Artigos.js por isto:

const express = require('express');
const router = express.Router();
const artigosController = require('../controllers/artigosController');

/**
 * @swagger
 * tags:
 * - name: Artigos
 * description: Endpoints para gerenciar artigos científicos.
 */

/**
 * @swagger
 * /Artigos:
 * get:
 * summary: Lista todos os artigos da UFPE.
 * tags: [Artigos]
 * responses:
 * '200':
 * description: Uma lista de artigos foi retornada com sucesso.
 */
router.get('/', artigosController.getTodosArtigosUFPE);

// DEIXE AS OUTRAS ROTAS SEM COMENTÁRIOS POR ENQUANTO
router.get('/Qualis', artigosController.artigosComQualis);
router.get('/getByDepartamentoouCentro', artigosController.getArtigosPorDepartamentoouCentro);
router.get('/buscarPorPalavrasChave', artigosController.buscarPorPalavrasChave);
router.get('/exportExcel', artigosController.exportExcelArtigos);
router.get('/create', artigosController.createTodosArtigos);
router.get('/deleteAll', artigosController.deleteAllArtigos);

module.exports = router;