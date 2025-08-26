const express = require('express');
const app = express();
const router = express.Router();
app.use(express.json());

const issnsController = require('../controllers/RelacaoIssnController');


router.get('/', issnsController.getTodosIssns);
router.get('/deleteAll', issnsController.deleteAllIssns);


module.exports = router;
