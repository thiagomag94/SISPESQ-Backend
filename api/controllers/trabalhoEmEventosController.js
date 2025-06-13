const mongoose = require('mongoose');

const getTodosTrabalhosEmEventos = async (req, res) => {
    try {
        console.log('Starting trabalhos em eventos query');
        
        // Cria índices se não existirem
        await mongoose.connection.db.collection('producao_geral').createIndexes([
            { key: { "producoes.trabalhos_eventos": 1 } },
            { key: { "producoes.trabalhos_eventos.TITULO_DO_TRABALHO": 1 } },
            { key: { "producoes.trabalhos_eventos.ANO_DO_TRABALHO": 1 } }
        ]);

        const pipeline = [
            { $match: { "producoes.trabalhos_eventos": { $exists: true, $not: { $size: 0 } } } },
            { $project: { _id: 0, trabalhos: "$producoes.trabalhos_eventos" } },
            { $unwind: "$trabalhos" },
            { $project: { 
                _id: 0,
                TITULO_DO_TRABALHO: "$trabalhos.TITULO_DO_TRABALHO",
                ANO_DO_TRABALHO: "$trabalhos.ANO_DO_TRABALHO",
                NOME_DO_EVENTO: "$trabalhos.NOME_DO_EVENTO",
                CIDADE_DO_EVENTO: "$trabalhos.CIDADE_DO_EVENTO",
                PAIS_DO_EVENTO: "$trabalhos.PAIS_DO_EVENTO",
                AUTORES: "$trabalhos.AUTORES"
            } }
        ];

        const producaoGeralCollection = mongoose.connection.collection('producao_geral');
        
        // Configura o response como stream
        res.setHeader('Content-Type', 'application/json');
        res.write('[');
        
        // Processa em chunks
        const batchSize = 1000;
        let isFirstChunk = true;
        
        const cursor = await producaoGeralCollection.aggregate(pipeline)
            .batchSize(batchSize);
        
        for await (const doc of cursor) {
            if (!isFirstChunk) {
                res.write(',');
            }
            isFirstChunk = false;
            res.write(JSON.stringify(doc));
        }
        
        res.end(']');
        
    } catch (err) {
        console.error('Erro ao buscar trabalhos em eventos:', err);
        res.status(500).json({ error: "Erro ao buscar trabalhos em eventos", details: err.message });
    }
};

module.exports = {
    getTodosTrabalhosEmEventos
};
