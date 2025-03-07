
const express = require('express');

const router = express.Router();
const {getResearchers,createResearchers, updateResearchers, deleteResearchers, deleteAllResearchers} = require('../controllers/ResearcherController');


router.get('/', getResearchers);

router.post('/create', createResearchers);

router.put('/update', updateResearchers);

router.delete('/delete', deleteResearchers);

router.delete('/deleteAll', deleteAllResearchers);


module.exports = router