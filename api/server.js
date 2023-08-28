const express = require('express')
const app = express()
const cors = require('cors')
const { default: mongoose } = require('mongoose')
const config = require('./config');
const Routes = require('./routes/Researchers');
const RouterRegister = require("./routes/Register");
const { usersdb } = require('./db');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json'); // Importe o arquivo JSON com a definição do Swagger


app.use(express.urlencoded({
    extended: true
    })
)


//Permitir requisições cruzadas//
// Middleware de CORS
app.use((req, res, next) => {
	//Qual site tem permissão de realizar a conexão, no exemplo abaixo está o "*" indicando que qualquer site pode fazer a conexão
    res.header("Access-Control-Allow-Origin", "*");
	//Quais são os métodos que a conexão pode realizar na API
    res.header("Access-Control-Allow-Methods", 'GET,PUT,POST,DELETE');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    app.use(cors());
    next();
});



// Configuração do Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

//permite o uso de arquivos estáticos
app.use(express.static('public'));

//permite o uso de req.body
app.use(express.json())

//tirar o warning 
mongoose.set("strictQuery", false);

//conectar ao banco

mongoose.connect(config.databaseUrl)
.then(()=>{
    app.listen(3000)
    console.log('Mongo DB conectado!!!')
})
.catch((err)=>{
    console.log(err)
})


// public routes
app.get('/', async (req, res)=>{
    try{
        res.redirect('../public/index.html')
    }catch(error){
        res.status(500).send("Internal server error")
    }
})



app.use('/Professores', Routes)
app.use('/Users', RouterRegister)


//configura o servidor
app.listen(config.port, ()=> {
    console.log(`Server running, PORT ${config.port}`)
})

//leitura do csv
/*fs.createReadStream('database.xlsx')
    .pipe(csv())
    .on('data', (rows)=>{
        professores.push(rows)
    }).on('end', ()=>{  
    })*/
