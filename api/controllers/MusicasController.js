const mongoose = require('mongoose');
const redis = require('../redis');
const Musicadb = require('../models/Musicas');

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

const filterMusicasDuplicados = async (musicas) => {
    const batchSize = 1000;
    const seen = new Map();
    const musicasUnicos = [];
    const musicasDuplicados = [];

    const normalize = (text = "") =>
        text.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

    const processBatch = async (batch) => {
        const promises = batch.map(async (musica) => {
            const doiValido = musica.DOI && musica.DOI.trim().length > 0;

            const key = doiValido
                ? `doi-${normalize(musica.DOI)}`
                : `title-${normalize(musica.TITULO)}-year-${musica.ANO?.toString()}`;

            if (seen.has(key)) {
                return { musica, isDuplicate: true };
            } else {
                seen.set(key, true);
                return { musica, isDuplicate: false };
            }
        });

        const results = await Promise.all(promises);
        return results;
    };

    for (let i = 0; i < musicas.length; i += batchSize) {
        const batch = musicas.slice(i, i + batchSize);
        const results = await processBatch(batch);
        
        results.forEach(result => {
            if (result.isDuplicate) {
                musicasDuplicados.push(result.musica);
            } else {
                musicasUnicos.push(result.musica);
            }
        });
    }
    arrayDuplicados = musicasDuplicados;

    return { musicasUnicos, musicasDuplicados };
};

const createTodasMusicas = async (req, res) => {
    try {
        // Primeiro remover todos os índices existentes
        const collection = mongoose.connection.db.collection('producao_geral');


        // Criar índices necessários
        await collection.createIndexes([
            { key: { "producoes.producao_artistica_cultural.musicas.DOI": 1 } },
            { key: { "producoes.producao_artistica_cultural.musicas.TITULO": 1 } },
            { key: { "producoes.producao_artistica_cultural.musicas.ANO": 1 } },

        ]);

        const pipeline = [
            { $match: { "producoes.producao_artistica_cultural.musicas": { $exists: true, $not: { $size: 0 } } } },

            { $unwind: "$producoes.producao_artistica_cultural.musicas" },
            { $project: {
                _id: 0,
                ID_LATTES_AUTOR: "$id_lattes",
                DEPARTAMENTO: "$departamento",
                CENTRO: "$centro",
                DOI: "$producoes.producao_artistica_cultural.musicas.DOI",
                TITULO: "$producoes.producao_artistica_cultural.musicas.TITULO",
                ANO: "$producoes.producao_artistica_cultural.musicas.ANO",
                AUTORES: "$producoes.producao_artistica_cultural.musicas.AUTORES",
                PALAVRAS_CHAVE: { // Transformar o objeto em um array
                    $filter: {
                        input: [
                            "$producoes.producao_artistica_cultural.musicas.PALAVRAS_CHAVE.PALAVRA_CHAVE_1",
                            "$producoes.producao_artistica_cultural.musicas.PALAVRAS_CHAVE.PALAVRA_CHAVE_2",
                            "$producoes.producao_artistica_cultural.musicas.PALAVRAS_CHAVE.PALAVRA_CHAVE_3",
                            "$producoes.producao_artistica_cultural.musicas.PALAVRAS_CHAVE.PALAVRA_CHAVE_4",
                            "$producoes.producao_artistica_cultural.musicas.PALAVRAS_CHAVE.PALAVRA_CHAVE_5",
                            "$producoes.producao_artistica_cultural.musicas.PALAVRAS_CHAVE.PALAVRA_CHAVE_6"
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

        const { musicasUnicos, musicasDuplicados } = await filterMusicasDuplicados(resultados);
        // Save duplicates to a separate collection
        const duplicatesCollection = mongoose.connection.db.collection('musicas_duplicados');
        await duplicatesCollection.deleteMany({}); // Clear previous duplicates
        await duplicatesCollection.insertMany(musicasDuplicados);
       
        // Limpa a coleção existente
        await Musicadb.deleteMany({});

        // Salva os musicas únicos
        await Musicadb.insertMany(musicasUnicos);

         res.status(200).json({ 
            message: `${musicasUnicos.length} músicas criadas com sucesso`,
            total: musicasUnicos.length 
        });
    } catch (err) {
        console.error('Erro ao criar músicas:', err);
        res.status(500).json({ 
            error: "Erro ao criar músicas", 
            details: err.message 
        });
    }
};



const getTodasMusicasUFPE = async (req, res) => {

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

        console.log('Query de busca de músicas:', query);
        // Primeiro contar todos os documentos
        const totalDocs = await Musicadb.countDocuments(query);

        // Obter parâmetros de paginação da query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Buscar os documentos paginados
        const musicas = await Musicadb.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ ANO: -1 });

        if (!musicas || musicas.length === 0) {
            return res.status(404).json({ 
                error: 'Nenhum documento encontrado',
                total: totalDocs
            });
        }

        // Calcular número total de páginas
        const totalPages = Math.ceil(totalDocs / limit);

        const duplicatesCollection = mongoose.connection.db.collection('musicas_duplicados');
        const duplicates = await duplicatesCollection.find({}).toArray();
        const arrayDuplicados = duplicates;

        res.status(200).json({
            total: totalDocs, // Total geral de documentos
            duplicatesCount: arrayDuplicados.length,
            duplicates: arrayDuplicados,    
            data: musicas,
            pagination: {
                page,
                limit,
                totalDocs,
                totalPages,
                hasMore: page < totalPages
            }
        });
    } catch (err) {
        console.error('Erro ao buscar músicas:', err);
        res.status(500).json({ 
            error: "Erro ao buscar músicas", 
            details: err.message 
        });
    }
};

const deleteAllMusicas = async (req, res) => {
    try {
        // Excluir todas as músicas
        const result = await Musicadb.deleteMany({});
        
        res.status(200).json({
            message: 'Todas as músicas foram excluídas com sucesso',
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('Erro ao excluir músicas:', err);
        res.status(500).json({ 
            error: "Erro ao excluir músicas", 
            details: err.message 
        });
    }
};

module.exports = {
    createTodasMusicas,
    getTodasMusicasUFPE,
    deleteAllMusicas
};
