const express = require('express');
const router = express.Router();

const capitulosController = require('../controllers/capitulosController');

router.get('/create', capitulosController.createTodosCapitulos);
router.get('/', capitulosController.getTodosCapitulosUFPE);
router.get('/deleteAll', capitulosController.deleteAllCapitulos);
router.get('/getByDepartamentoouCentro', capitulosController.getCapitulosPorDepartamentoouCentro);
//router.get('/buscarPorPalavrasChave', capitulosController.buscarPorPalavrasChave);

module.exports = router;
