const mongoose = require('mongoose');

const getTodosLivrosUFPE = async (req, res) => {
    try {
        console.log('Starting livros query');
        
        // Cria índices se não existirem
        await mongoose.connection.db.collection('producao_geral').createIndexes([
            { key: { "producoes.livros": 1 } },
            { key: { "producoes.livros.TITULO_DO_LIVRO": 1 } },
            { key: { "producoes.livros.ANO": 1 } }
        ]);

        const pipeline = [
            { $match: { "producoes.livros": { $exists: true, $not: { $size: 0 } } } },
            { $project: { _id: 0, livros: "$producoes.livros" } },
            { $unwind: "$livros" },
            { $project: { 
                _id: 0,
                TITULO_DO_LIVRO: "$livros.TITULO_DO_LIVRO",
                ANO: "$livros.ANO"
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
        console.error('Erro ao buscar livros:', err);
        res.status(500).json({ error: "Erro ao buscar livros", details: err.message });
    }
};

module.exports = {
    getTodosLivrosUFPE
};