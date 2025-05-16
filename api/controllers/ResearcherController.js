const fs = require('fs');
const csv = require('csv-parser');
const { Datapesqdb, Researcherdb } = require('../db');
const multer = require('multer');
const path = require('path');






const updateDatabaseTeste = async (req,res)=>{
  try{
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'Nenhum arquivo enviado ou formato inválido' 
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Arquivo de pesquisadores enviado com sucesso',
      filename: req.file.originalname,
      path: req.file.path
    });
  }catch(error){
    res.status(500).json({
      success: true,
      message: 'Internal Server Error',
  })
  }
}
const updateDatabase = async (req, res) => {
  try {
    const DataPesq = [];
    fs.createReadStream('researchers.csv')
      .pipe(csv({ 
        separator: ';', 
        mapHeaders: ({ header }) => header.trim() // remove espaços nos cabeçalhos
      }))
      .on('data', (row) => {
        // Objeto para armazenar os dados tratados
        const trimmedData = {};
        
        // Aplica trim() em todos os campos string
        for (const key in row) {
          if (typeof row[key] === 'string') {
            trimmedData[key] = row[key].trim();
          } else {
            trimmedData[key] = row[key];
          }
        }
        
        DataPesq.push(trimmedData);
      })
      .on('end', async () => {
        try {
          const deletedATAPESQ = await Researcherdb.deleteMany({});
          
          if (deletedATAPESQ) {
            // Inserir os dados tratados
            const result = await Researcherdb.insertMany(DataPesq);
            res.status(200).json({
              message: 'Dados atualizados com sucesso',
              count: result.length
            });
          }
        } catch (err) {
          console.error('Erro ao inserir dados:', err);
          res.status(500).send("Erro ao inserir dados no banco");
        }
      })
      .on('error', (error) => {
        console.error('Erro ao ler o arquivo CSV:', error);
        res.status(500).send("Erro ao processar o arquivo CSV");
      });
  } catch (error) {
    console.error('Erro no processo:', error);
    res.status(500).send("Internal server error");
  }
};

//---------------------------GET --------------------------------------

const getResearchers = async (req, res) => {
  try {
    function converterParaISO(dataDDMMYYYY) {
      if (!dataDDMMYYYY) return null;
      const [dia, mes, ano] = dataDDMMYYYY.split('/');
      return new Date(`${ano}-${mes}-${dia}`);
    }


    // Extrai os parâmetros de busca e filtro da query string
    const { id, professor, centro, departamento, titulacao, admissaomaiorque, admissaomenorque, dedicacao } = req.query;

  
    console.log(admissaomenorque)
    // Construindo a consulta
    let query = {};

    // Filtro por professor (busca pelo nome)
    if (id) {
      query._id = id
    }
    
    if (professor) {
      const palavras = professor.trim().split(' ').filter(Boolean); // Divide o nome em palavras
     

      const regexPalavras = palavras.map(palavra => new RegExp(palavra, 'i')); // Cria um regex para cada palavra
      
      // Se houver múltiplas palavras, usa `$and` para que todas sejam encontradas no nome
      if (regexPalavras.length > 1) {
        query.$and = regexPalavras.map(regex => ({ PESQUISADOR: regex }));
      } else {
        query.PESQUISADOR = regexPalavras[0]; // Apenas uma palavra, busca diretamente
      }
    }

    // Filtro por centro (SIG_CENTRO), se informado
    if (centro) {
      query.SIGLA_CENTRO = centro;
    }

    // Filtro por departamento (URG_LOTACAO), se informado
    if (departamento) {
     
      query.UORG_LOTACAO = departamento;
    }

    if(titulacao) query.TITULACAO = titulacao

    if(dedicacao) query.REGIME_DE_TRABALHO = dedicacao

    if (admissaomaiorque || admissaomenorque) {
      const filtroData = {};
    
      if (admissaomaiorque) {
        filtroData.$gte = new Date(admissaomaiorque);
      }
    
      if (admissaomenorque) {
        filtroData.$lte = new Date(admissaomenorque);
      }
    
      if (Object.keys(filtroData).length > 0) {
        query.DATA_INGRESSO_UFPE = filtroData;
      }
    }
    

    // Exibe a query final para depuração
    console.log("Query:", query);
    // Consultando os dados no banco de dados
   
    const resultado_query = await Researcherdb.find(query);
    console.log("Resultado:", resultado_query);
    

    // Retornando os resultados
    res.status(200).json({ professores: resultado_query, total_professores: resultado_query.length });

  } catch (error) {
    //console.error("Erro na consulta:", error);
    res.status(500).json({ error: "Erro interno no servidor", details: error.message });
  }
};


//------------------------CREATE--------------------------------------------------------------

async function createResearchers(req, res) {
  try {
    const dataPesq = new Researcherdb(req.body);
    await dataPesq.save();
    res.status(201).json(dataPesq);
  } catch (err) {
    res.status(400).json({ error: 'Erro ao criar documento', details: err });
  }
}

//------------------------UPDATE----------------------------------------------------------------

async function updateResearchers(req, res) {
  try {
    const { id } = req.params;
    const updatedDataPesq = await Researcherdb.findByIdAndUpdate(id, req.body, { new: true });
    
    if (!updatedDataPesq) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    res.status(200).json(updatedDataPesq);
  } catch (err) {
    res.status(400).json({ error: 'Erro ao atualizar documento', details: err });
  }
}


//------------------------------DELETE-----------------------------------------

async function deleteResearchers(req, res) {
  try {
    const { id } = req.params;
    const deletedDataPesq = await Researcherdb.findByIdAndDelete(id);
    
    if (!deletedDataPesq) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    res.status(200).json({ message: 'Documento excluído com sucesso' });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao excluir documento', details: err });
  }
}

//---------------------------DELETEALL---------------------------------------------

async function deleteAllResearchers(req, res) {
  try {
    
    const deleteResearchers = await Departamentodb.deleteMany({});
    
    if (!deleteResearchers) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    res.status(200).json({ message: 'Documento excluído com sucesso' });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao excluir documento', details: err });
  }
}

module.exports = {
 getResearchers,
  updateDatabase,
  updateDatabaseTeste,
  updateResearchers,
  createResearchers,
  deleteResearchers,
  deleteAllResearchers
}

