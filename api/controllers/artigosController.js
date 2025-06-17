const mongoose = require('mongoose');
const redis = require('../redis');
const Artigos = require('../models/Artigo');

// Função para normalizar texto
const normalize = (text) => {
    if (!text) return '';
    return text
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "") // Remove acentos
        .replace(/[^\w\s]/gi, '') // Remove caracteres especiais
        .replace(/\s+/g, ' ') // Substitui múltiplos espaços por um único espaço
        .trim();
};

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

        const duplicatesCollection = mongoose.connection.db.collection('artigos_duplicados');
        const duplicates = await duplicatesCollection.find({}).toArray();
        const arrayDuplicados = duplicates;

        res.status(200).json({
            total: totalDocs, // Total geral de documentos
            duplicatesCount: arrayDuplicados.length,
            duplicates: arrayDuplicados,    
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
    arrayDuplicados = artigosDuplicados;

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
            
            { $unwind: "$producoes.artigos" },
            { $project: { 
                _id: 0,
                ID_LATTES_AUTOR: "$id_lattes",
                DEPARTAMENTO: "$departamento",
                CENTRO: "$centro",
                DOI: "$producoes.artigos.DOI",
                TITULO_DO_ARTIGO: "$producoes.artigos.TITULO_DO_ARTIGO",
                ANO_DO_ARTIGO: "$producoes.artigos.ANO_DO_ARTIGO",
                AUTORES: "$producoes.artigos.AUTORES",
                PALAVRAS_CHAVE: "$producoes.artigos.PALAVRAS_CHAVE"
            } }
        ];

        const resultados = [];
        const cursor = await mongoose.connection.db.collection('producao_geral')
            .aggregate(pipeline)
            .batchSize(1000);

        for await (const doc of cursor) {
            resultados.push(doc);
        }

        const { artigosUnicos, artigosDuplicados } = await filterArtigosDuplicados(resultados);
        // Save duplicates to a separate collection
        const duplicatesCollection = mongoose.connection.db.collection('artigos_duplicados');
        await duplicatesCollection.deleteMany({}); // Clear previous duplicates
        await duplicatesCollection.insertMany(artigosDuplicados);
       
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

const getArtigosPorDepartamentoouCentro = async (req, res) => {
    try {
        const departamento = req.query.departamento;
        const centro = req.query.centro;
        const groupBy = req.query.groupBy || 'DEPARTAMENTO'; // Default to DEPARTAMENTO
        
        // Validate groupBy parameter
        if (groupBy !== 'DEPARTAMENTO' && groupBy !== 'CENTRO') {
            return res.status(400).json({
                error: "Valor inválido para groupBy. Use 'DEPARTAMENTO' ou 'CENTRO'"
            });
        }

        // Build aggregation pipeline
        const pipeline = [
            // Match stage to filter by department or center
            { $match: {
                ...(departamento && { DEPARTAMENTO: departamento }),
                ...(centro && { CENTRO: centro })
            }},
            
            // Group stage using the groupBy parameter
            { $group: {
                _id: `$${groupBy}`,
                total: { $sum: 1 },
                artigos: { $push: "$ROOT" }
            }}
        ];

        const result = await Artigos.aggregate(pipeline);
        
        res.status(200).json({
            total: result.length,
            data: result
        });
    } catch (err) {
        console.error('Erro ao buscar artigos:', err);
        res.status(500).json({ 
            error: "Erro ao buscar artigos", 
            details: err.message 
        });
    }
};

const buscarPorPalavrasChave = async (req, res) => {
    try {
        const palavraChave = req.query.palavraChave;
        
        if (!palavraChave) {
            return res.status(400).json({
                error: 'Palavra-chave é obrigatória'
            });
        }

        // Normalizar a palavra-chave de entrada
        const normalizedKeyword = normalize(palavraChave);

        // Criar regex para busca parcial e case-insensitive
        const regex = new RegExp(normalizedKeyword, 'i');

        // Buscar artigos onde qualquer palavra-chave contenha a palavra-chave buscada
        const pipeline = [
            {
                $match: {
                    $or: [
                        { 'PALAVRAS_CHAVE.PALAVRA_CHAVE_1': regex },
                        { 'PALAVRAS_CHAVE.PALAVRA_CHAVE_2': regex },
                        { 'PALAVRAS_CHAVE.PALAVRA_CHAVE_3': regex },
                        { 'PALAVRAS_CHAVE.PALAVRA_CHAVE_4': regex },
                        { 'PALAVRAS_CHAVE.PALAVRA_CHAVE_5': regex },
                        { 'PALAVRAS_CHAVE.PALAVRA_CHAVE_6': regex }
                    ]
                }
            },
            {
                $project: {
                    _id: 0,
                    ID_LATTES_AUTOR: 1,
                    TITULO_DO_ARTIGO: 1,
                    PALAVRAS_CHAVE: 1,
                    score: {
                        $add: [
                            { $cond: [{ $regexMatch: { input: "$PALAVRAS_CHAVE.PALAVRA_CHAVE_1", regex: regex } }, 1, 0] },
                            { $cond: [{ $regexMatch: { input: "$PALAVRAS_CHAVE.PALAVRA_CHAVE_2", regex: regex } }, 1, 0] },
                            { $cond: [{ $regexMatch: { input: "$PALAVRAS_CHAVE.PALAVRA_CHAVE_3", regex: regex } }, 1, 0] },
                            { $cond: [{ $regexMatch: { input: "$PALAVRAS_CHAVE.PALAVRA_CHAVE_4", regex: regex } }, 1, 0] },
                            { $cond: [{ $regexMatch: { input: "$PALAVRAS_CHAVE.PALAVRA_CHAVE_5", regex: regex } }, 1, 0] },
                            { $cond: [{ $regexMatch: { input: "$PALAVRAS_CHAVE.PALAVRA_CHAVE_6", regex: regex } }, 1, 0] }
                        ]
                    }
                }
            },
            {
                $sort: { score: -1 }
            }
        ];

        const resultados = await Artigos.aggregate(pipeline);

        // Agrupar por ID_LATTES_AUTOR
        const autores = {};
        resultados.forEach(artigo => {
            const autorId = artigo.ID_LATTES_AUTOR;
            if (!autores[autorId]) {
                autores[autorId] = {
                    ID_LATTES_AUTOR: autorId,
                    artigos: []
                };
            }
            autores[autorId].artigos.push(artigo);
        });

        // Converter objeto para array
        const autoresArray = Object.values(autores);

        res.status(200).json({
            total: autoresArray.length,
            data: autoresArray
        });
    } catch (err) {
        console.error('Erro ao buscar por palavras-chave:', err);
        res.status(500).json({ 
            error: "Erro ao buscar por palavras-chave", 
            details: err.message 
        });
    }
};

module.exports = {
    createTodosArtigos,
    getTodosArtigosUFPE,
    deleteAllArtigos,
    getArtigosPorDepartamentoouCentro,
    buscarPorPalavrasChave
};
