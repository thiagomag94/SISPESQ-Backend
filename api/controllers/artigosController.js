const mongoose = require('mongoose');
const redis = require('../redis');

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
        // Check if Redis is available
        if (!redis) {
            console.log('Redis is not available, skipping cache');
            // Proceed with MongoDB query
            console.log('Starting artigos query');
            
            // Cria índices se não existirem
            await mongoose.connection.db.collection('producao_geral').createIndexes([
                { key: { "producoes.artigos.DOI": 1 } },
                { key: { "producoes.artigos.TITULO_DO_ARTIGO": 1 } },
                { key: { "producoes.artigos.ANO_DO_ARTIGO": 1 } }
            ]);

            const pipeline = [
                { $match: { "producoes.artigos": { $exists: true, $not: { $size: 0 } } } },
                { $project: { _id: 0, artigos: "$producoes.artigos" } },
                { $unwind: "$artigos" },
                { $project: { 
                    _id: 0,
                    DOI: "$artigos.DOI",
                    TITULO_DO_ARTIGO: "$artigos.TITULO_DO_ARTIGO",
                    ANO_DO_ARTIGO: "$artigos.ANO_DO_ARTIGO"
                } }
            ];

            const producaoGeralCollection = mongoose.connection.collection('producao_geral');
            
            // Configura o response como stream
            res.setHeader('Content-Type', 'application/json');
            res.write('[');
            
            // Processa em chunks
            const batchSize = 1000;
            let isFirstChunk = true;
            let allData = '[';
            
            const cursor = await producaoGeralCollection.aggregate(pipeline)
                .batchSize(batchSize);
            
            for await (const doc of cursor) {
                if (!isFirstChunk) {
                    res.write(',');
                    allData += ',';
                }
                isFirstChunk = false;
                const docStr = JSON.stringify(doc);
                res.write(docStr);
                allData += docStr;
            }
            
            res.end(']');
            allData += ']';
            return;
        }

        // Check Redis cache first
        const cacheKey = 'artigos_ufpe';
        
        // Try to get from cache
        let cachedData;
        try {
            cachedData = await redis.get(cacheKey);
        } catch (redisError) {
            console.error('Redis error:', redisError);
            // Fall back to MongoDB query
            console.log('Redis error occurred, falling back to MongoDB');
            // Proceed with MongoDB query
            console.log('Starting artigos query');
            
            // Cria índices se não existirem
            await mongoose.connection.db.collection('producao_geral').createIndexes([
                { key: { "producoes.artigos.DOI": 1 } },
                { key: { "producoes.artigos.TITULO_DO_ARTIGO": 1 } },
                { key: { "producoes.artigos.ANO_DO_ARTIGO": 1 } }
            ]);

            const pipeline = [
                { $match: { "producoes.artigos": { $exists: true, $not: { $size: 0 } } } },
                { $project: { _id: 0, artigos: "$producoes.artigos" } },
                { $unwind: "$artigos" },
                { $project: { 
                    _id: 0,
                    DOI: "$artigos.DOI",
                    TITULO_DO_ARTIGO: "$artigos.TITULO_DO_ARTIGO",
                    ANO_DO_ARTIGO: "$artigos.ANO_DO_ARTIGO"
                } }
            ];

            const producaoGeralCollection = mongoose.connection.collection('producao_geral');
            
            // Configura o response como stream
            res.setHeader('Content-Type', 'application/json');
            res.write('[');
            
            // Processa em chunks
            const batchSize = 1000;
            let isFirstChunk = true;
            let allData = '[';
            
            const cursor = await producaoGeralCollection.aggregate(pipeline)
                .batchSize(batchSize);
            
            for await (const doc of cursor) {
                if (!isFirstChunk) {
                    res.write(',');
                    allData += ',';
                }
                isFirstChunk = false;
                const docStr = JSON.stringify(doc);
                res.write(docStr);
                allData += docStr;
            }
            
            res.end(']');
            allData += ']';
            
            // Try to store in Redis
            try {
                await redis.set(cacheKey, allData, 'EX', 86400); // 24 hours
                console.log('Cached data successfully');
            } catch (redisError) {
                console.error('Failed to cache data:', redisError);
            }
            return;
        }
        
        if (cachedData) {
            console.log('Returning cached data');
            res.setHeader('Content-Type', 'application/json');
            res.end(cachedData);
            return;
        }

        // If we got here, Redis is available but cache miss occurred
        console.log('Cache miss, querying MongoDB');
        // Proceed with MongoDB query (code is the same as above)
        
        // Cria índices se não existirem
        await mongoose.connection.db.collection('producao_geral').createIndexes([
            { key: { "producoes.artigos.DOI": 1 } },
            { key: { "producoes.artigos.TITULO_DO_ARTIGO": 1 } },
            { key: { "producoes.artigos.ANO_DO_ARTIGO": 1 } }
        ]);

        const pipeline = [
            { $match: { "producoes.artigos": { $exists: true, $not: { $size: 0 } } } },
            { $project: { _id: 0, artigos: "$producoes.artigos" } },
            { $unwind: "$artigos" },
            { $project: { 
                _id: 0,
                DOI: "$artigos.DOI",
                TITULO_DO_ARTIGO: "$artigos.TITULO_DO_ARTIGO",
                ANO_DO_ARTIGO: "$artigos.ANO_DO_ARTIGO"
            } }
        ];

        const producaoGeralCollection = mongoose.connection.collection('producao_geral');
        
        // Configura o response como stream
        res.setHeader('Content-Type', 'application/json');
        res.write('[');
        
        // Processa em chunks
        const batchSize = 1000;
        let isFirstChunk = true;
        let allData = '[';
        
        const cursor = await producaoGeralCollection.aggregate(pipeline)
            .batchSize(batchSize);
        
        for await (const doc of cursor) {
            if (!isFirstChunk) {
                res.write(',');
                allData += ',';
            }
            isFirstChunk = false;
            const docStr = JSON.stringify(doc);
            res.write(docStr);
            allData += docStr;
        }
        
        res.end(']');
        allData += ']';
        
        // Try to store in Redis
        try {
            await redis.set(cacheKey, allData, 'EX', 86400); // 24 hours
            console.log('Cached data successfully');
        } catch (redisError) {
            console.error('Failed to cache data:', redisError);
        }
        
    } catch (err) {
        console.error('Erro ao buscar artigos:', err);
        res.status(500).json({ error: "Erro ao buscar artigos", details: err.message });
    }
};

module.exports = {
    criaArtigo,
    getTodosArtigosUFPE
};
