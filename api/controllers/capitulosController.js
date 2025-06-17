const mongoose = require('mongoose');
const redis = require('../redis');
const {Capitulo} = require('../models/Capitulo');

// Text normalization function
const normalize = (text) => {
    if (!text) return '';
    return text
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "") // Remove accents
        .replace(/[^\w\s]/gi, '') // Remove special characters
        .replace(/\s+/g, ' ') // Replace multiple spaces with one
        .trim();
};

const filterCapitulosDuplicados = async (capitulos) => {
    if (!Array.isArray(capitulos)) {
        throw new Error('Input must be an array of chapters');
    }

    const batchSize = 1000;
    const seen = new Map();
    const capitulosUnicos = [];
    const capitulosDuplicados = [];

    // Normalization function
    const normalize = (text = "") =>
        text.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

    // Process batch function
    const processBatch = async (batch) => {
        const promises = batch.map(async (capitulo) => {
            // Create a unique key based on available fields
            const key = capitulo.DOI
                ? `doi-${normalize(capitulo.DOI)}-title-${normalize(capitulo.TITULO_DO_CAPITULO_DO_LIVRO)}-year-${capitulo.ANO?.toString()}`
                : `title-${normalize(capitulo.TITULO_DO_CAPITULO_DO_LIVRO)}-year-${capitulo.ANO?.toString()}-book-${normalize(capitulo.TITULO_DO_LIVRO)}`;

            if (seen.has(key)) {
                return { capitulo, isDuplicate: true };
            } else {
                seen.set(key, true);
                return { capitulo, isDuplicate: false };
            }
        });

        const results = await Promise.all(promises);
        return results;
    };

    // Process all batches
    for (let i = 0; i < capitulos.length; i += batchSize) {
        const batch = capitulos.slice(i, i + batchSize);
        const results = await processBatch(batch);
        
        results.forEach(result => {
            if (result.isDuplicate) {
                capitulosDuplicados.push(result.capitulo);
            } else {
                capitulosUnicos.push(result.capitulo);
            }
        });
    }

    return { capitulosUnicos, capitulosDuplicados };
};

// Get all chapters with pagination
const getTodosCapitulosUFPE = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get total documents count
        const totalDocs = await Capitulo.countDocuments({});
        if (totalDocs === 0) {
            return res.status(404).json({ 
                error: 'Nenhum capítulo encontrado',
                total: totalDocs
            });
        }

        // Get chapters with pagination
        const capitulos = await Capitulo.find({})
            .skip(skip)
            .limit(limit)
            .sort({ ANO: -1 });

        // Get duplicates
        const duplicatesCollection = mongoose.connection.db.collection('capitulos_duplicados');
        const duplicates = await duplicatesCollection.find({}).toArray();

        // Calculate pagination info
        const totalPages = Math.ceil(totalDocs / limit);

        res.status(200).json({
            total: totalDocs,
            duplicatesCount: duplicates.length,
            duplicates: duplicates,
            data: capitulos,
            pagination: {
                page,
                limit,
                totalDocs,
                totalPages,
                hasMore: page < totalPages
            }
        });
    } catch (err) {
        console.error('Erro ao buscar capítulos:', err);
        res.status(500).json({ 
            error: "Erro ao buscar capítulos", 
            details: err.message 
        });
    }
};

// Create all chapters from producao_geral
const createTodosCapitulos = async (req, res) => {
    try {
        // First, create necessary indexes
        await mongoose.connection.db.collection('producao_geral').createIndexes([
            { key: { "producoes.capitulos.DOI": 1 } },
            { key: { "producoes.capitulos.TITULO_DO_CAPITULO_DO_LIVRO": 1 } },
            { key: { "producoes.capitulos.ANO": 1 } }
        ]);

        // Build the aggregation pipeline
        const pipeline = [
            { $match: { "producoes.capitulos": { $exists: true, $not: { $size: 0 } } } },
            { $unwind: "$producoes.capitulos" },
            { $project: { 
                _id: 0,
                ID_LATTES_AUTOR: "$id_lattes",
                DEPARTAMENTO: "$departamento",
                CENTRO: "$centro",
                DOI: "$producoes.capitulos.DOI",
                TITULO_DO_CAPITULO_DO_LIVRO: "$producoes.capitulos.TITULO_DO_CAPITULO_DO_LIVRO",
                ANO: "$producoes.capitulos.ANO",
                AUTORES: "$producoes.capitulos.AUTORES",
                PALAVRAS_CHAVE: "$producoes.capitulos.PALAVRAS_CHAVE"
            } }
        ];

        // Execute the pipeline
        const resultados = [];
        const cursor = await mongoose.connection.db.collection('producao_geral')
            .aggregate(pipeline)
            .batchSize(1000);

        for await (const doc of cursor) {
            resultados.push(doc);
        }

        console.log(`Total documents processed: ${resultados.length}`);

        // Filter duplicates
        const { capitulosUnicos, capitulosDuplicados } = await filterCapitulosDuplicados(resultados);

        // Update duplicates collection
        const duplicatesCollection = mongoose.connection.db.collection('capitulos_duplicados');
        await duplicatesCollection.deleteMany({});
        await duplicatesCollection.insertMany(capitulosDuplicados);

        // Update main collection
        await Capitulo.deleteMany({});
        await Capitulo.insertMany(capitulosUnicos);

        res.status(200).json({ 
            message: `${capitulosUnicos.length} capítulos criados com sucesso`,
            total: capitulosUnicos.length,
            duplicates: capitulosDuplicados.length
        });
    } catch (err) {
        console.error('Erro ao criar capítulos:', err);
        res.status(500).json({ 
            error: "Erro ao criar capítulos", 
            details: err.message 
        });
    }
};

// Delete all chapters
const deleteAllCapitulos = async (req, res) => {
    try {
        const result = await Capitulo.deleteMany({});
        res.status(200).json({
            message: 'Todos os capítulos foram excluídos com sucesso',
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('Erro ao excluir capítulos:', err);
        res.status(500).json({ 
            error: "Erro ao excluir capítulos", 
            details: err.message 
        });
    }
};


// Get chapters by department or center
const getCapitulosPorDepartamentoouCentro = async (req, res) => {
    try {
        const departamento = req.query.departamento;
        const centro = req.query.centro;
        const groupBy = req.query.groupBy || 'DEPARTAMENTO';

        if (groupBy !== 'DEPARTAMENTO' && groupBy !== 'CENTRO') {
            return res.status(400).json({
                error: "Valor inválido para groupBy. Use 'DEPARTAMENTO' ou 'CENTRO'"
            });
        }

        const pipeline = [
            { $match: {
                ...(departamento && { DEPARTAMENTO: departamento }),
                ...(centro && { CENTRO: centro })
            }},
            { $group: {
                _id: `$${groupBy}`,
                total: { $sum: 1 },
                capitulos: { $push: "$ROOT" }
            }}
        ];

        const result = await Capitulos.aggregate(pipeline);
        res.status(200).json({
            total: result.length,
            data: result
        });
    } catch (err) {
        console.error('Erro ao buscar capítulos:', err);
        res.status(500).json({ 
            error: "Erro ao buscar capítulos", 
            details: err.message 
        });
    }
};

module.exports = {
    getTodosCapitulosUFPE,
    createTodosCapitulos,
    deleteAllCapitulos,
    getCapitulosPorDepartamentoouCentro
};