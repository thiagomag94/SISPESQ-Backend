const mongoose = require('mongoose');
const redis = require('../redis');
const ArtesCenicasdb = require('../models/ArtesCenicas');

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

const filterArtesDuplicados = async (artes) => {
    const batchSize = 1000;
    const seen = new Map();
    const artesUnicos = [];
    const artesDuplicados = [];

    const normalize = (text = "") =>
        text.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

    const processBatch = async (batch) => {
        const promises = batch.map(async (arte) => {
            const doiValido = arte.DOI && arte.DOI.trim().length > 0;

            const key = doiValido
                ? `doi-${normalize(arte.DOI)}`
                : `title-${normalize(arte.TITULO)}-year-${arte.ANO?.toString()}`;

            if (seen.has(key)) {
                return { arte, isDuplicate: true };
            } else {
                seen.set(key, true);
                return { arte, isDuplicate: false };
            }
        });

        const results = await Promise.all(promises);
        return results;
    };

    for (let i = 0; i < artes.length; i += batchSize) {
        const batch = artes.slice(i, i + batchSize);
        const results = await processBatch(batch);
        
        results.forEach(result => {
            if (result.isDuplicate) {
                artesDuplicados.push(result.arte);
            } else {
                artesUnicos.push(result.arte);
            }
        });
    }
    arrayDuplicados = artesDuplicados;

    return { artesUnicos, artesDuplicados };
};

const createTodasArtes = async (req, res) => {
    try {
        // Primeiro remover todos os índices existentes
        const collection = mongoose.connection.db.collection('producao_geral');


        // Criar índices necessários
        await collection.createIndexes([
            { key: { "producoes.producao_artistica_cultural.artes_cenicas.DOI": 1 } },
            { key: { "producoes.producao_artistica_cultural.artes_cenicas.TITULO": 1 } },
            { key: { "producoes.producao_artistica_cultural.artes_cenicas.ANO": 1 } },

        ]);

        const pipeline = [
            { $match: { "producoes.producao_artistica_cultural.artes_cenicas": { $exists: true, $not: { $size: 0 } } } },

            { $unwind: "$producoes.producao_artistica_cultural.artes_cenicas" },
            { $project: {
                _id: 0,
                ID_LATTES_AUTOR: "$id_lattes",
                DEPARTAMENTO: "$departamento",
                CENTRO: "$centro",
                DOI: "$producoes.producao_artistica_cultural.artes_cenicas.DOI",
                TITULO: "$producoes.producao_artistica_cultural.artes_cenicas.TITULO",
                ANO: "$producoes.producao_artistica_cultural.artes_cenicas.ANO",
                AUTORES: "$producoes.producao_artistica_cultural.artes_cenicas.AUTORES",
                PALAVRAS_CHAVE: { // Transformar o objeto em um array
                    $filter: {
                        input: [
                            "$producoes.producao_artistica_cultural.artes_cenicas.PALAVRAS_CHAVE.PALAVRA_CHAVE_1",
                            "$producoes.producao_artistica_cultural.artes_cenicas.PALAVRAS_CHAVE.PALAVRA_CHAVE_2",
                            "$producoes.producao_artistica_cultural.artes_cenicas.PALAVRAS_CHAVE.PALAVRA_CHAVE_3",
                            "$producoes.producao_artistica_cultural.artes_cenicas.PALAVRAS_CHAVE.PALAVRA_CHAVE_4",
                            "$producoes.producao_artistica_cultural.artes_cenicas.PALAVRAS_CHAVE.PALAVRA_CHAVE_5",
                            "$producoes.producao_artistica_cultural.artes_cenicas.PALAVRAS_CHAVE.PALAVRA_CHAVE_6"
                        ],
                        as: "item",
                        cond: { $ne: [ "$$item", null ] } // Remove valores nulos
                    }
                }
            } }
        ];

        const resultados = [];
        const cursor = await mongoose.connection.db.collection('producao_geral')
            .aggregate(pipeline)
            .batchSize(1000);

        for await (const doc of cursor) {
            doc.PALAVRAS_CHAVE = doc.PALAVRAS_CHAVE.map(kw => normalize(kw));
            resultados.push(doc);
        }

        const { artesUnicos, artesDuplicados } = await filterArtesDuplicados(resultados);
        // Save duplicates to a separate collection
        const duplicatesCollection = mongoose.connection.db.collection('artes_duplicados');
        await duplicatesCollection.deleteMany({}); // Clear previous duplicates
        await duplicatesCollection.insertMany(artesDuplicados);
       
        // Limpa a coleção existente
        await ArtesCenicasdb.deleteMany({});

        // Salva os artes únicos
        await ArtesCenicasdb.insertMany(artesUnicos);

         res.status(200).json({ 
            message: `${artesUnicos.length} artes cenicas criadas com sucesso`,
            total: artesUnicos.length 
        });
    } catch (err) {
        console.error('Erro ao criar artes cênicas:', err);
        res.status(500).json({ 
            error: "Erro ao criar artes cênicas", 
            details: err.message 
        });
    }
};



const getTodasArtesUFPE = async (req, res) => {

    try {
        let query = {}
        // Verifica se há filtros na query
        if (req.query.departamento) {
            query.DEPARTAMENTO = req.query.departamento;
        }

        if (req.query.centro) {
            query.CENTRO = req.query.centro;
        }
      
        if(req.query.dataInicio){
            let filtroData = {};
            const dataInicio = new Date(req.query.dataInicio);
            dataInicio.setHours(0, 0, 0, 0);
            filtroData.$gte = dataInicio; // Maior ou igual a data de início
            if (Object.keys(filtroData).length > 0) {
                query.ANO_DO_ARTIGO = filtroData;
              }
            
            
        }

        console.log('Query de busca de artes cênicas:', query);
        // Primeiro contar todos os documentos
        const totalDocs = await ArtesCenicasdb.countDocuments(query);

        // Obter parâmetros de paginação da query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Buscar os documentos paginados
        const artes = await ArtesCenicasdb.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ ANO: -1 });

        if (!artes || artes.length === 0) {
            return res.status(404).json({ 
                error: 'Nenhum documento encontrado',
                total: totalDocs
            });
        }

        // Calcular número total de páginas
        const totalPages = Math.ceil(totalDocs / limit);

        const duplicatesCollection = mongoose.connection.db.collection('artes_duplicados');
        const duplicates = await duplicatesCollection.find({}).toArray();
        const arrayDuplicados = duplicates;

        res.status(200).json({
            total: totalDocs, // Total geral de documentos
            duplicatesCount: arrayDuplicados.length,
            duplicates: arrayDuplicados,    
            data: artes,
            pagination: {
                page,
                limit,
                totalDocs,
                totalPages,
                hasMore: page < totalPages
            }
        });
    } catch (err) {
        console.error('Erro ao buscar artes cênicas:', err);
        res.status(500).json({ 
            error: "Erro ao buscar artes cênicas", 
            details: err.message 
        });
    }
};

const deleteAllArtes = async (req, res) => {
    try {
        // Excluir todas as artes cênicas
        const result = await ArtesCenicasdb.deleteMany({});
        
        res.status(200).json({
            message: 'Todas as artes cênicas foram excluídas com sucesso',
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('Erro ao excluir artes cênicas:', err);
        res.status(500).json({ 
            error: "Erro ao excluir artes cênicas", 
            details: err.message 
        });
    }
};

module.exports = {
    createTodasArtes,
    getTodasArtesUFPE,
    deleteAllArtes
};