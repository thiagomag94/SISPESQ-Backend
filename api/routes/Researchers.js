
const express = require('express');
const app = express()
const router = express.Router();
const checkToken = require('../controllers/Auth');
const {professoresdb} = require('../db')


//permitir o uso do req.body
app.use(express.json())



//rotas da api

router.get('/', async(req, res)=>{
    try{
        const page = req.query.page || 1
        const limit = req.query.limit || 10
        const offset = (page-1)*limit
        const count = await professoresdb.countDocuments()
        const resultado_query = await professoresdb.find().skip(offset).limit(limit)
        res.json({data: resultado_query, total:count})
            
    }catch(error){
        res.status(500).json({ error: error})
    }
   
    
})
    
router.post('/professor', async(req, res)=>{
    try{
        const resultado_query = await professoresdb.find()
        const nomeRequested = req.body.professores
        const arrayfiltered = resultado_query.filter(professor=>  nomeRequested.includes(professor.NOME))
        console.log(arrayfiltered.length)
        if(arrayfiltered.length === 0){
            res.status(404).json({message:["Infelizmente não encontramos em nosso banco de dados pesquisador vinculado à UFPE."]})
        }else if (arrayfiltered.length > 0){
            console.log(arrayfiltered)
            res.status(200).json({professores:arrayfiltered})
    }
        
    }catch(error){
        res.status(500).json({ error: 'Internal server error'})
    }
    
})


router.post('/addProfessor', async(req, res)=>{
    // valida a requisição na entrada
    if (!(req.body.NOME) || !(req.body.EMAIL_PRINCIPAL) ||  !(req.body.EMAIL_SECUNDARIO) || !(req.body.DEPARTAMENTO) || !(req.body.CENTRO) ){
        res.status(400).send("Erro: a requisição deve conter nome, emailPrimario, emailSecundario, departamento e centro.")
    }
    else{
        
        try{
            const professor =  await professoresdb.find({NOME:req.body.NOME.toUpperCase()})
            let nome =  professor.length>0 ? professor[0].NOME : false
            if (!nome){
                try{
                    //cria novo documento
                    const novoProfessor = new professoresdb({
                        NOME:req.body.NOME.toUpperCase(),
                        EMAIL_PRINCIPAL:req.body.EMAIL_PRINCIPAL.toUpperCase(),
                        EMAIL_SECUNDARIO:req.body.EMAIL_SECUNDARIO.toUpperCase(),
                        DEPARTAMENTO:req.body.DEPARTAMENTO.toUpperCase(),
                        CENTRO:req.body.CENTRO.toUpperCase(),
                            
                    }) 
                    //inclui efetivamente o professor se já não estiver no banco
                    await novoProfessor.save((err, result)=>{
                    if (err){
                        console.log(err)
                    }
                    res.status(201).json({message:"inserido no banco", result:result})
                    })
                
                }catch(error){
                    //
                    res.status(500).send(error, "Desculpe, nossos servidores estão um pouco sobrecarregados. Tente mais tarde.")
                }
            }else if(professor[0].NOME) {
                res.send("Nome já existe no banco")
                
            }

        }catch(error){

            res.send({error:error, message:"algo deu errado"})
        }
    }
})

router.delete('/:id', checkToken, async(req, res)=>{
    try{
        userId = req.params.id
        professoresdb.findByIdAndDelete(userId, (err, result) =>{
            if (err){
                res.status(500).json({ msg: 'Internal server error', error:err})
            }
            else{
                res.status(204).json({message:"professor deletado", result:result})
            }
        } )

    }catch(error){
        res.status(500).json({ error: 'Internal server error'})
    }
})





    

module.exports = router