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
          console.log("Banco anterior apagado");
          Datapesqdb.insertMany(DataPesq).then(() => {
            console.log("Banco novo criado!!!");
            res.status(200).json(DataPesq);
          }).catch((err) => console.log(err));
        }
      });
  } catch (error) {
    res.status(500).send("Internal server error");
  }
}

const getAll = async (req, res) => {
  try {
    const resultado_query = await Datapesqdb.find();
    res.json(resultado_query);
  } catch (error) {
    res.status(500).json({ error: error });
  }
}

const getResearchers = async (req, res) => {
  try {
    const { professor } = req.query;
    if (professor.trim() !=='') {
      const palavras = professor.split(' ').filter(Boolean);
      const regexPalavras = palavras.map(palavra => new RegExp(palavra, 'i'));
      const query = { $and: regexPalavras.map(regex => ({ PESQUISADOR: regex })) };
      const resultado_query = await Datapesqdb.find(query);
      res.status(200).json({ professores: resultado_query });
    } else if(professor.trim()===''){
      const resultado_query = await Datapesqdb.find();
      res.status(200).json({ professores: resultado_query });
     
    }else {
      res.status(400).json({ message: "Parâmetro 'professor' não fornecido" });
    }
  } catch (error) {
    res.status(500).json({ error: error });
  }
}


module.exports = {
 getResearchers,
  getAll,
  updateDatabase

}
