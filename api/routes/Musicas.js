const express = require('express');
const app = express();
const router = express.Router();
app.use(express.json());

const musicasController = require('../controllers/MusicasController');

router.get('/create', musicasController.createTodasMusicas);
router.get('/', musicasController.getTodasMusicasUFPE);
router.get('/deleteAll', musicasController.deleteAllMusicas);


module.exports = router;
