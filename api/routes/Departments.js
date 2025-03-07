const express = require('express');
const app = express()
const router = express.Router();
const departmentController = require('../controllers/departmentController')


app.use(express.json())



router.get('/', departmentController.getDepartments)

router.post('/create', departmentController.createDepartments)

router.put('/update', departmentController.updateDepartments)

router.delete('/delete', departmentController.deleteDepartments)

router.delete('/deleteAll', departmentController.deleteAllDepartments)

module.exports = router