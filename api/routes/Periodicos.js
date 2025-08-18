const express = require('express');
const app = express();
const router = express.Router();
app.use(express.json());

const periodicosController = require('../controllers/periodicosController');


router.get('/', periodicosController.getTodosPeriodicos);
router.get('/deleteAll', periodicosController.deleteAllPeriodicos);


module.exports = router;
