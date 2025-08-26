const RelacaoIssndb = require('../models/RelacaoIssn');
const fs = require('fs');
const csv = require('csv-parser');
const { get } = require('http');
const { query } = require('winston');



const updateDatabase = async (req, res) => {
  try {
    const issnArray = [];
    
    // Use um Promise para encapsular a leitura do CSV, tornando o fluxo assíncrono mais fácil de gerenciar
    await new Promise((resolve, reject) => {
      fs.createReadStream('RelacaoISSN.csv')
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
          issnArray.push(trimmedData);
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
      // 1. Exclui todos os índices da coleção (exceto o _id)
      console.log('Excluindo índices existentes...');
      await RelacaoIssndb.collection.dropIndexes();
      await RelacaoIssndb.deleteMany({});
      const result = await RelacaoIssndb.insertMany(issnArray);

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


const getTodosIssns = async (req, res) => {
  try{
    let query = {}
    

    if(req.query.issn){
      query.ISSN = req.query.issn
    }

    if(req.query.eissn){
      query.EISSN = req.query.eissn
    }
    
    // Primeiro contar todos os documentos
    const totalDocs = await RelacaoIssndb.countDocuments(query);

    // Obter parâmetros de paginação da query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    // Buscar os documentos paginados
    const issnArray = await RelacaoIssndb.find(query)
        .skip(skip)
        .limit(limit)
      

     // Calcular número total de páginas
    const totalPages = Math.ceil(totalDocs / limit);
    
     res.status(200).json({
        total: totalDocs, // Total geral de documentos
        data: issnArray,
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

const deleteAllIssns = async (req, res) => {
    try {
        // Excluir todos os ISSNs
         await RelacaoIssndb.collection.dropIndexes();
        const result = await RelacaoIssndb.deleteMany({});
        
        res.status(200).json({
            message: 'Todos os ISSNs foram excluídos com sucesso',
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('Erro ao excluir ISSNs:', err);
        res.status(500).json({
            error: "Erro ao excluir ISSNs",
            details: err.message
        });
    }

  }

module.exports = {
  updateDatabase,
  getTodosIssns,
  deleteAllIssns
};
