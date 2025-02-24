const express = require('express')
const app = express()
const cors = require('cors')
const { default: mongoose } = require('mongoose')
const config = require('./config');
const Routes = require('./routes/Researchers');
const RouterRegister = require("./routes/Register");
const { usersdb, Datapesqdb } = require('./db');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json'); // Importe o arquivo JSON com a definição do Swagger
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');


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
app.use(express.static(path.join(__dirname, 'public')));

//permite o uso de req.body
app.use(express.json())

//tirar o warning 
mongoose.set("strictQuery", false);

//conectar ao banco

mongoose.connect(config.databaseUrl)
.then(()=>{
    console.log('Mongo DB conectado!!!')
   
    
})
.catch((err)=>{
    console.log("Falha ao conectar", err)
})



// public routes
app.get('/', async (req, res)=>{
    try{
        res.sendFile(path.join(__dirname, '/../public', '/index.html'));
    }catch(error){
        res.status(500).send("Internal server error")
    }
})

app.get('/teste', async (req, res)=>{
    try{
        res.sendFile(path.join(__dirname, '/../public', '/upload.html'));
    }catch(error){
        res.status(500).send("Internal server error")
    }
})

app.get('/updateDb', async (req, res)=>{
    try{
        const DataPesq = []
        fs.createReadStream('ATUALIZADA_INDICADORES_UFPE_13_05_2024_Thiago.csv')
        .pipe(csv({separator: ';', from_line:3}))
        .on('data', (rows)=>{
            DataPesq.push(rows)
           
        }).on('end', async()=>{  
            const deletedATAPESQ = await Datapesqdb.deleteMany({})
            
            if(deletedATAPESQ){
                console.log("Banco anterior apagado")
                Datapesqdb.insertMany(DataPesq).then(()=>{
                    console.log("Banco novo criado!!!")
                    res.status(200).json(DataPesq)
                }).catch((err)=> console.log(err)) 
            }
           
        })
        
    }catch(error){
        
        res.status(500).send("Internal server error")
    }
})

app.get('/all', async(req, res)=>{
    try{
        
        const resultado_query = await Datapesqdb.find()
        if (resultado_query) {
            console.log("consulta feita")

        }
        res.json(resultado_query)
            
    }catch(error){
        res.status(500).json({ error: error})
    }
   
    
})



app.get('/pesquisadores', async(req, res) => {
    try {
        const { professor } = req.query;
        
        console.log(professor);

        if (professor) {
            const palavras = professor.split(' ').filter(Boolean);
            const regexPalavras = palavras.map(palavra => new RegExp(palavra, 'i'));
            const query = { $and: regexPalavras.map(regex => ({ PESQUISADOR: regex })) };

            const resultado_query = await Datapesqdb.find(query);
            console.log(resultado_query);

            if (resultado_query) {
                console.log("consulta feita");
                res.status(200).json({ professores: resultado_query });
                console.log("Enviamos o professor")
           
            }
        } else {
            res.send("PROFESSOR NÃO ENVIADO");
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error });
    }
});


app.get('/departamentos', async (req, res) => {
    console.log("fui chamado")
    const { departamento } = req.query;
    console.log(departamento);

    try {
        const array_departamentos = await Datapesqdb.distinct('UORG_LOTACAO');

        if (departamento) {
            //transforma a string em um array de palavras e remove as palavras vazias
            const palavras = departamento.split(' ').filter(Boolean);
           
            //faz um regex e o ^ indica que a palavra deve começar com a palavra do array
            const resultado_query = await Datapesqdb.find({
                UORG_LOTACAO: { $regex: `${departamento}$`, $options: 'i' }
            });
            
            
            console.log(resultado_query);
            //se o resultado da query for maior que 0, retorna os professores encontrados
            if (resultado_query.length > 0) {
                console.log("Consulta feita");
                return res.status(200).json({ professores_por_departamento: resultado_query, departamentos: array_departamentos });
            } else {
                return res.status(200).json({ professores_por_departamento:[] , departamentos: array_departamentos });
                
            }
        } else {
            return res.status(400).json({ message: "Parâmetro 'departamento' não fornecido" });
        }
    } catch (error) {
        console.error('Erro ao buscar departamentos:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
});


app.get('/centros', async (req, res) => {
    try {
        const centros = await Datapesqdb.distinct('SIGLA_CENTRO');
        res.json(centros);
    } catch (error) {
        console.error('Erro ao buscar departamentos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});


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
