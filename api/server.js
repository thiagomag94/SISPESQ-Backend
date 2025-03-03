
const Routes = require('./routes/Professores(old)');
const RouterRegister = require("./routes/RegisterController");
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config  = require('./config'); // Caminho relativo para o arquivo config.js
const { usersdb, Datapesqdb } = require('./db');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const corsMiddleware = require('./middleware/cors');
const publicRoutesController = require('./controllers/publicRoutesController');
const researcherController = require('./controllers/researcherController');
const departmentController = require('./controllers/departmentController');




const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(corsMiddleware);

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
mongoose.connect(config.databaseUrl)
  .then(() => console.log('Mongo DB connected!'))
  .catch(err => console.log('Connection failed', err));

// Routes
app.use('/Professores', Routes);
app.use('/Users', RouterRegister);

// Public routes
app.get('/', publicRoutesController.getIndex);
app.get('/teste', publicRoutesController.getUpload);
app.get('/updateDb', researcherController.updateDatabase);
app.get('/all', researcherController.getAll);
app.get('/pesquisadores', researcherController.getResearchers);
app.get('/departamentos', departmentController.getDepartments);


// Start server
app.listen(config.port, () => {
  console.log(`Server running, PORT ${config.port}`);
});

