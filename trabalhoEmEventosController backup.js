const mongoose = require('mongoose');
const redis = require('../redis');
const {TrabalhoEvento} = require('../models/TrabalhoEvento');

const getTodosTrabalhosEmEventos = async (req, res) => {
    try {
        // Check if Redis is available
        if (!redis) {
            console.log('Redis is not available, skipping cache');
            // Proceed with MongoDB query
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
        const cacheKey = 'trabalhos_eventos';
        
        // Try to get from cache
        let cachedData;
        try {
            cachedData = await redis.get(cacheKey);
        } catch (redisError) {
            console.error('Redis error:', redisError);
            // Fall back to MongoDB query
            console.log('Redis error occurred, falling back to MongoDB');
            // Proceed with MongoDB query
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
        console.error('Erro ao buscar trabalhos em eventos:', err);
        res.status(500).json({ error: "Erro ao buscar trabalhos em eventos", details: err.message });
    }
};

module.exports = {
    getTodosTrabalhosEmEventos
};
