
const express = require('express');

const router = express.Router();
const {getResearchers,createResearchers, updateResearchers, deleteResearchers, deleteAllResearchers, getDuplicatedResearchers} = require('../controllers/ResearcherController');


router.get('/', getResearchers);
router.get('/duplicates', getDuplicatedResearchers); // Assuming this is for testing purposes, you might want to rename it later

router.post('/create', createResearchers);

router.put('/update', updateResearchers);

router.delete('/delete', deleteResearchers);

router.delete('/deleteAll', deleteAllResearchers);


module.exports = router