const mongoose = require('mongoose');
const redis = require('../redis');
const Artigos = require('../models/Artigo');


const getTodosArtigosUFPE = async (req, res) => {
    try {
        // Primeiro contar todos os documentos
        const totalDocs = await Artigos.countDocuments({});
        
        // Obter parâmetros de paginação da query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Buscar os documentos paginados
        const artigos = await Artigos.find({})
            .skip(skip)
            .limit(limit)
            .sort({ ANO_DO_ARTIGO: -1 });

        if (!artigos || artigos.length === 0) {
            return res.status(404).json({ 
                error: 'Nenhum documento encontrado',
                total: totalDocs
            });
        }

        // Calcular número total de páginas
        const totalPages = Math.ceil(totalDocs / limit);

        res.status(200).json({
            total: totalDocs, // Total geral de documentos
            data: artigos,
            pagination: {
                page,
                limit,
                totalDocs,
                totalPages,
                hasMore: page < totalPages
            }
        });
    } catch (err) {
        console.error('Erro ao buscar artigos:', err);
        res.status(500).json({ 
            error: "Erro ao buscar artigos", 
            details: err.message 
        });
    }
};

const filterArtigosDuplicados = async (artigos) => {
    const batchSize = 1000;
    const seen = new Map();
    const artigosUnicos = [];
    const artigosDuplicados = [];

    const normalize = (text = "") =>
        text.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

    const processBatch = async (batch) => {
        const promises = batch.map(async (artigo) => {
            const doiValido = artigo.DOI && artigo.DOI.trim().length > 0;

            const key = doiValido
                ? `doi-${normalize(artigo.DOI)}`
                : `title-${normalize(artigo.TITULO_DO_ARTIGO)}-year-${artigo.ANO_DO_ARTIGO?.toString()}`;

            if (seen.has(key)) {
                return { artigo, isDuplicate: true };
            } else {
                seen.set(key, true);
                return { artigo, isDuplicate: false };
            }
        });

        const results = await Promise.all(promises);
        return results;
    };

    for (let i = 0; i < artigos.length; i += batchSize) {
        const batch = artigos.slice(i, i + batchSize);
        const results = await processBatch(batch);
        
        results.forEach(result => {
            if (result.isDuplicate) {
                artigosDuplicados.push(result.artigo);
            } else {
                artigosUnicos.push(result.artigo);
            }
        });
    }

    return { artigosUnicos, artigosDuplicados };
};

const createTodosArtigos = async (req, res) => {
    try {
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
                ANO_DO_ARTIGO: "$artigos.ANO_DO_ARTIGO",
                AUTORES: "$artigos.AUTORES",
                PALAVRAS_CHAVE: "$artigos.PALAVRAS_CHAVE"
            } }
        ];

        const resultados = [];
        const cursor = await mongoose.connection.db.collection('producao_geral')
            .aggregate(pipeline)
            .batchSize(1000);

        for await (const doc of cursor) {
            resultados.push(doc);
        }

        const { artigosUnicos } = await filterArtigosDuplicados(resultados);
        
       
        // Limpa a coleção existente
        await Artigos.deleteMany({});
        // Salva os artigos únicos
        await Artigos.insertMany(artigosUnicos);
        
        res.status(200).json({ 
            message: `${artigosUnicos.length} artigos criados com sucesso`,
            total: artigosUnicos.length 
        });
    } catch (err) {
        console.error('Erro ao criar artigos:', err);
        res.status(500).json({ 
            error: "Erro ao criar artigos", 
            details: err.message 
        });
    }
};

const deleteAllArtigos = async (req, res) => {
    try {
        // Excluir todos os artigos
        const result = await Artigos.deleteMany({});
        
        res.status(200).json({
            message: 'Todos os artigos foram excluídos com sucesso',
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('Erro ao excluir artigos:', err);
        res.status(500).json({ 
            error: "Erro ao excluir artigos", 
            details: err.message 
        });
    }
};

module.exports = {
   
    getTodosArtigosUFPE,
    createTodosArtigos,
    deleteAllArtigos
};
