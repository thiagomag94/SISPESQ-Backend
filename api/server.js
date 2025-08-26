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
const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const corsMiddleware = require('./middleware/cors');
const publicRoutesController = require('./controllers/publicRoutesController');
const researcherController = require('./controllers/ResearcherController')
const periodicosController = require('./controllers/periodicosController');
const LattesController = require('./controllers/LattesController')
const issnController = require('./controllers/relacaoIssnController')
const upload = require('./controllers/UploadController')
const { uploadMiddleware, checkUploadDirs, uploadFile } = require('./controllers/UploadController');
const RouterPatentes = require('./routes/Patentes')
const RouterSoftwares = require('./routes/Softwares')
const RouterOrientacoes = require('./routes/Orientacoes')
const RouterProducao = require('./routes/Produção')
const RouterArtigos = require('./routes/Artigos')
const RouterLivros = require('./routes/Livros')
const RouterTrabalhos = require('./routes/Trabalhos')
const RouterCapitulos = require('./routes/Capitulos')
const RouterOutrasProducoesBibliograficas = require('./routes/OutrasProducoesBibliograficas')
const RouterPartituras = require('./routes/Partituras');
const RouterArtesCenicas = require('./routes/ArtesCenicas');
const RoutesMusicas = require('./routes/Musicas');
const RouterPeriodicos = require('./routes/Periodicos');
const RouterIssns = require('./routes/Issns');
const { requestLogger, errorLogger } = require('./middleware/logger');
const { metricsMiddleware } = require('./middleware/metrics');





const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(corsMiddleware);
// Responder às requisições OPTIONS manualmente, caso necessário
app.options('*', cors());  // Responde a todas as requisições OPTIONS com CORS

// Adicione antes das rotas
app.use(requestLogger);
app.use(metricsMiddleware);

// Adicione as rotas de health e metrics
app.use('/health', require('./routes/health'));


// Adicione depois das rotas
app.use(errorLogger);

// No seu arquivo principal (ex: api/server.js)


// Constrói o caminho absoluto para sua pasta de rotas
// __dirname é uma variável do Node.js que dá o caminho da pasta do arquivo atual
const routesPath = path.join(__dirname, './routes/*.js');

// LOG DE DEPURAÇÃO: Isso vai nos mostrar o caminho exato no seu terminal
console.log(`[Swagger] Tentando ler arquivos de rota em: ${routesPath}`);

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Produção Científica',
      version: '1.0.0',
      description: 'Uma API para consultar dados de artigos, pesquisadores e Qualis.',
    },
    servers: [ { url: 'http://localhost:3000' } ], // Ajuste a porta
  },
  // Usaremos o caminho absoluto que acabamos de criar
  apis: [routesPath],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Static files
app.use(express.static('public'));



// Database connection
mongoose.connect(config.MONGO_URI, {
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
app.use('/Artigos', RouterArtigos)
//app.use('/Centers')
app.use('/Researchers',RouterResearcher )
app.use('/Lattes', RouterLattes);
app.use('/Patentes', RouterPatentes);
app.use('/Softwares', RouterSoftwares);
app.use('/Orientacoes', RouterOrientacoes);
app.use('/Producao/', RouterProducao);
app.use('/Livros', RouterLivros)
app.use('/Trabalhos', RouterTrabalhos)
app.use('/Capitulos', RouterCapitulos)
app.use('/OutrasProducoesBibliograficas', RouterOutrasProducoesBibliograficas);
app.use('/Partituras', RouterPartituras);
app.use('/ArtesCenicas', RouterArtesCenicas);
app.use('/Musicas', RoutesMusicas);
app.use('/Periodicos', RouterPeriodicos);
app.use('/RelacaoIssn', RouterIssns);

// Public routes
app.get('/updateDb/researchers', researcherController.updateDatabase);
app.get('/updateDb/periodicos', periodicosController.updateDatabase);
app.post('/updatedb/researchers', checkUploadDirs, uploadMiddleware, researcherController.updateDatabaseTeste)
app.get('/updateDb/RelacaoIssn', issnController.updateDatabase);
app.get('/', publicRoutesController.getIndex);
app.get('/teste', publicRoutesController.getUpload);


// Start server
app.listen(config.port, '0.0.0.0', () => {
  console.log(`Server running, PORT ${config.port}`);
});
