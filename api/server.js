
const Routes = require('./routes/Professores(old)');
const RouterRegister = require("./routes/Authorize");
const RouterDepartment = require('./routes/Departments')
const RouterResearcher = require('./routes/Researchers')
const RouterLattes = require('./routes/Lattes')
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config  = require('./config'); // Caminho relativo para o arquivo config.js
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const corsMiddleware = require('./middleware/cors');
const publicRoutesController = require('./controllers/publicRoutesController');
const researcherController = require('./controllers/ResearcherController')
const LattesController = require('./controllers/LattesController')
const upload = require('./controllers/UploadController')
const { uploadMiddleware, checkUploadDirs, uploadFile } = require('./controllers/UploadController');
const RouterPatentes = require('./routes/Patentes')
const RouterSoftwares = require('./routes/Softwares')
const RouterOrientacoes = require('./routes/Orientacoes')
const RouterProducao = require('./routes/Produção')



const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(corsMiddleware);
// Responder às requisições OPTIONS manualmente, caso necessário
app.options('*', cors());  // Responde a todas as requisições OPTIONS com CORS

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Static files
app.use(express.static('public'));



// Database connection
mongoose.connect(config.databaseUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize:10  // Limite de conexões simultâneas
})
  .then(() => console.log('Mongo DB connected!',mongoose.connections.length))
  .catch(err => console.log('Connection failed', err));
  mongoose.set('strictQuery', false);
// Routes
app.use('/Professores', Routes);
app.use('/Users', RouterRegister);
app.use('/Departments', RouterDepartment)
//app.use('/Articles')
//app.use('/Centers')
app.use('/Researchers',RouterResearcher )
app.use('/Lattes', RouterLattes);
app.use('/Patentes', RouterPatentes);
app.use('/Softwares', RouterSoftwares);
app.use('/Orientacoes', RouterOrientacoes);
app.use('/Producao/', RouterProducao);
// Public routes
app.get('/updateDb', researcherController.updateDatabase);
app.post('/updatedb/researchers', checkUploadDirs, uploadMiddleware, researcherController.updateDatabaseTeste)
app.get('/', publicRoutesController.getIndex);
app.get('/teste', publicRoutesController.getUpload);


// Start server
app.listen(config.port, '0.0.0.0', () => {
  console.log(`Server running, PORT ${config.port}`);
});

