const fs = require('fs');
const csv = require('csv-parser');
const { Datapesqdb } = require('../db');


const updateDatabase = async (req, res) => {
  try {
    const DataPesq = [];
    fs.createReadStream('ATUALIZADA_INDICADORES_UFPE_13_05_2024_Thiago.csv')
      .pipe(csv({ separator: ';', from_line: 3 }))
      .on('data', (rows) => {
        DataPesq.push(rows);
      }).on('end', async () => {
        const deletedATAPESQ = await Datapesqdb.deleteMany({});
        if (deletedATAPESQ) {
          //console.log("Banco anterior apagado");
          Datapesqdb.insertMany(DataPesq).then(() => {
            //console.log("Banco novo criado!!!");
            res.status(200).json(DataPesq);
          }).catch((err) => console.log(err));
        }
      });
  } catch (error) {
    res.status(500).send("Internal server error");
  }
}

//---------------------------GET --------------------------------------

const getResearchers = async (req, res) => {
  try {
    // Extrai os parâmetros de busca e filtro da query string
    const { professor, centro, departamento } = req.query;

    // Controle para debug
    //console.log("Parâmetros recebidos:", { professor, centro, departamento });

    // Construindo a consulta
    let query = {};

    // Filtro por professor (busca pelo nome)
    
    
    if (professor) {
      const palavras = professor.trim().split(' ').filter(Boolean); // Divide o nome em palavras
      //console.log("Palavras extraídas:", palavras);

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
      //console.log("departamento", departamento)
      query.UORG_LOTACAO = departamento;
    }

    // Exibe a query final para depuração
    //console.log("Query final:", JSON.stringify(query, null, 2));

    // Consultando os dados no banco de dados
    const resultado_query = await Datapesqdb.find(query);
    //console.log("Resultado da busca:", resultado_query);

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
    const dataPesq = new Datapesqdb(req.body);
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
    const updatedDataPesq = await Datapesqdb.findByIdAndUpdate(id, req.body, { new: true });
    
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
    const deletedDataPesq = await Datapesqdb.findByIdAndDelete(id);
    
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
  updateResearchers,
  createResearchers,
  deleteResearchers,
  deleteAllResearchers
}

