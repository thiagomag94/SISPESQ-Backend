

const mongoose = require('mongoose');

const criaArtigo = async (req, res) => {
    // Criar o artigo no banco de dados
    
    Artigos.create(artigoData)
    .then(artigo => {
    console.log('Artigo criado:', artigo);
    return artigo;  // Passar o artigo para o próximo passo
    })
    .catch(err => {
    console.error('Erro ao criar artigo:', err);
    });
    
  
}
const getTodosArtigosUFPE = async (req, res) => {
    try {
        console.log('Starting artigos query');
        const pipeline = [
            {
                $match: {
                    "producoes.artigos": { $exists: true, $not: { $size: 0 } }
                }
            },
            {
                $project: {
                    _id: 1,
                    id_lattes: 1,
                    nome: 1,
                    departamento: 1,
                    artigos: "$producoes.artigos"
                }
            },
            {
                $unwind: "$artigos"
            },
            {
                $addFields: {
                    "artigos.id_pesquisador": "$id_lattes",
                    "artigos.nome_pesquisador": "$nome",
                    "artigos.departamento_pesquisador": "$departamento"
                }
            },
            {
                $replaceRoot: { newRoot: "$artigos" }
            }
        ];

        console.log('Pipeline:', pipeline);
        
        const producaoGeralCollection = mongoose.connection.collection('producao_geral');
        if (!producaoGeralCollection) {
            console.error('Collection not found');
            return res.status(500).json({ error: "Collection not found" });
        }

        const cursor = await producaoGeralCollection.aggregate(pipeline);
        const result = await cursor.toArray();
        
        console.log('Query result count:', result.length);
        
        if (result.length === 0) {
            console.log('No artigos found');
            return res.status(404).json({ message: "No artigos found" });
        }

        res.status(200).json(result);
    } catch (err) {
        console.error('Erro ao buscar artigos:', err);
        res.status(500).json({ error: "Erro ao buscar artigos", details: err.message });
    }
};

module.exports = {
    criaArtigo,
    getTodosArtigosUFPE
}
