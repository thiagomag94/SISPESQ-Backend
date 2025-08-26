const Periodicosdb = require('../models/Periodicos');
const fs = require('fs');
const csv = require('csv-parser');
const { get } = require('http');
const { query } = require('winston');



const updateDatabase = async (req, res) => {
  try {
    const periodicosArray = [];
    
    // Use um Promise para encapsular a leitura do CSV, tornando o fluxo assíncrono mais fácil de gerenciar
    await new Promise((resolve, reject) => {
      fs.createReadStream('Qualis.csv')
        .pipe(csv({ 
          separator: ';', 
          mapHeaders: ({ header }) => header.trim()
        }))
        .on('data', (row) => {
          const trimmedData = {};
          for (const key in row) {
            if (typeof row[key] === 'string') {
              trimmedData[key] = row[key].trim();
            } else {
              trimmedData[key] = row[key];
            }
          }
          periodicosArray.push(trimmedData);
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (error) => {
          console.error('Erro ao ler o arquivo CSV:', error);
          reject(new Error("Erro ao processar o arquivo CSV"));
        });
    });

    // Se a leitura do CSV foi bem-sucedida, continue com as operações do banco de dados
    try {
      await Periodicosdb.deleteMany({});
      const result = await Periodicosdb.insertMany(periodicosArray);
      
      res.status(200).json({
        message: 'Dados atualizados com sucesso',
        count: result.length
      });
      
    } catch (dbError) {
      console.error('Erro na operação do banco de dados:', dbError);
      res.status(500).send("Erro ao atualizar o banco de dados");
    }

  } catch (error) {
    // Captura erros da leitura do CSV ou qualquer outro erro inicial
    console.error('Erro geral no processo:', error);
    if (!res.headersSent) {
      res.status(500).send(error.message || "Internal server error");
    }
  }
};


const getTodosPeriodicos = async (req, res) => {
  try{
    let query = {}
    if(req.query.titulo){
      query.$text = { $search: req.query.titulo }
    }

    if(req.query.qualis){
      query.QUALIS = req.query.qualis
    }

    if(req.query.issn){
      query.ISSN = req.query.issn
    }
    
    // Primeiro contar todos os documentos
    const totalDocs = await Periodicosdb.countDocuments(query);

    // Obter parâmetros de paginação da query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    // Buscar os documentos paginados
    const periodicos = await Periodicosdb.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ TITULO: 1 });

     // Calcular número total de páginas
    const totalPages = Math.ceil(totalDocs / limit);
    
     res.status(200).json({
        total: totalDocs, // Total geral de documentos
        data: periodicos,
        pagination: {
            page,
            limit,
            totalDocs,
            totalPages,
            hasMore: page < totalPages
        }
    });
} catch (err) {
    console.error('Erro ao buscar periódicos:', err);
    res.status(500).send(`Erro ao buscar periódicos: ${err.message}`);
  }
};

const deleteAllPeriodicos = async (req, res) => {
    try {
        // Excluir todos os periódicos
        const result = await Periodicosdb.deleteMany({});
        
        res.status(200).json({
            message: 'Todos os periódicos foram excluídos com sucesso',
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('Erro ao excluir periódicos:', err);
        res.status(500).json({ 
            error: "Erro ao excluir periódicos", 
            details: err.message 
        });
    }

  }

module.exports = {
  updateDatabase,
  getTodosPeriodicos,
  deleteAllPeriodicos
};
