const mongoose = require('mongoose');
const TrabalhoEvento = require('../models/TrabalhoEvento');

// Function to filter duplicates and save to TrabalhoEvento collection
const filterTrabalhosEventosDuplicados = async (trabalhos) => {
    const batchSize = 1000;
    const seen = new Map();
    const trabalhosEventosUnicos = [];
    const trabalhosEventosDuplicados = [];

    const normalize = (text) => {
        if (!text) return '';
        return text.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    };

    const processBatch = async (batch) => {
        const promises = batch.map(async (trabalho) => {
            const doiValido = trabalho.DOI && trabalho.DOI.trim().length > 0;

            const nomeautores = trabalho.AUTORES
                ?.map((autor) => { return normalize(autor.NOME_COMPLETO_DO_AUTOR); })
                .sort();

            const key = doiValido
                ? `doi-${normalize(trabalho.DOI)}-title-${normalize(trabalho.TITULO_DO_TRABALHO)}-ano-realizacao-${normalize(trabalho.ANO_DE_REALIZACAO)}`
                : `title-${normalize(trabalho.TITULO_DO_TRABALHO)}-year-${trabalho.ANO_DO_TRABALHO?.toString()}-evento-${normalize(trabalho.NOME_DO_EVENTO)}-ano-realizacao-${normalize(trabalho.ANO_DE_REALIZACAO)}-cidade-${normalize(trabalho.CIDADE_DO_EVENTO)}-autores-${nomeautores.join(",")}`;

            if (seen.has(key)) {
                //const original = seen.get(key);
                //console.log(" DUPLICADO DETECTADO:");
                //console.log("Original:", original);
                //console.log("Novo:", trabalho);
                return { trabalho, isDuplicate: true };
            } else {
                seen.set(key, trabalho);
                return { trabalho, isDuplicate: false };
            }
        });

        return await Promise.all(promises);
    };

    for (let i = 0; i < trabalhos.length; i += batchSize) {
        const batch = trabalhos.slice(i, i + batchSize);
        const results = await processBatch(batch);

        results.forEach((result) => {
            if (result.isDuplicate) {
                trabalhosEventosDuplicados.push(result.trabalho);
            } else {
                trabalhosEventosUnicos.push(result.trabalho);
            }
        });
    }

   

    return { trabalhosEventosUnicos, trabalhosEventosDuplicados };
}

// Function to create all data from producao_geral
const createTodosTrabalhosEmEventos = async (req, res) => {
    try {
        // Create indexes if they don't exist
        await mongoose.connection.db.collection('producao_geral').createIndexes([
            { key: { "producoes.trabalhos_eventos": 1 } },
            { key: { "producoes.trabalhos_eventos.TITULO_DO_TRABALHO": 1 } },
            { key: { "producoes.trabalhos_eventos.ANO_DO_TRABALHO": 1 } }
        ]);

        const pipeline = [
            { $match: { "producoes.trabalhos_eventos": { $exists: true, $not: { $size: 0 } } } },
            { $unwind: "$producoes.trabalhos_eventos" },
            { $project: { 
                _id: 0,
                ID_LATTES_AUTOR: "$id_lattes", 
                TITULO_DO_TRABALHO: "$producoes.trabalhos_eventos.TITULO_DO_TRABALHO",
                ANO_DO_TRABALHO: "$producoes.trabalhos_eventos.ANO_DO_TRABALHO",
                NOME_DO_EVENTO: "$producoes.trabalhos_eventos.NOME_DO_EVENTO",
                CIDADE_DO_EVENTO: "$producoes.trabalhos_eventos.CIDADE_DO_EVENTO",
                PAIS_DO_EVENTO: "$producoes.trabalhos_eventos.PAIS_DO_EVENTO",
                AUTORES: "$producoes.trabalhos_eventos.AUTORES"
            } }
        ];

        const producaoGeralCollection = mongoose.connection.collection('producao_geral');
        const cursor = await producaoGeralCollection.aggregate(pipeline).batchSize(1000);
        
        const resultados = [];
        for await (const doc of cursor) {
            resultados.push(doc);
        }
        const { trabalhosEventosUnicos } = await filterTrabalhosEventosDuplicados(resultados);
        // Save unique works to TrabalhoEvento collection
        //await TrabalhoEvento.deleteMany({}); // Clear existing data
       try {
        await TrabalhoEvento.insertMany(trabalhosEventosUnicos);
        res.status(200).json({ message: `${trabalhosEventosUnicos.length} Trabalhos em eventos criados com sucesso` });
       } catch (err) {
        console.error('Erro ao salvar trabalhos em eventos:', err);
        throw err;
       }
    
        
        
       
    } catch (err) {
        console.error('Erro ao buscar trabalhos em eventos:', err);
        throw err;
    }

   
};

const deleteAllTrabalhosEmEventos = async (req, res) => {
    try {
        const deleteTrabalhosEmEventos = await TrabalhoEvento.deleteMany({});
        
        if (!deleteTrabalhosEmEventos) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        res.status(200).json({ message: 'Documento excluído com sucesso' });
    } catch (err) {
        res.status(400).json({ error: 'Erro ao excluir documento', details: err });
    }
}

const getAllTrabalhosEmEventos = async (req, res) => {
    try {
        let query = {}
        // Verifica se há filtros na query

        if(req.query.dataInicio){
            let filtroData = {};
            const dataInicio = new Date(req.query.dataInicio);
            dataInicio.setHours(0, 0, 0, 0);
            filtroData.$gte = dataInicio; // Maior ou igual a data de início
            if (Object.keys(filtroData).length > 0) {
                query.ANO_DO_TRABALHO = filtroData;
              }
            
            
        }
        // Primeiro contar todos os documentos
        const totalDocs = await TrabalhoEvento.countDocuments(query);
        
        // Obter parâmetros de paginação da query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Buscar os documentos paginados
        const trabalhosEmEventos = await TrabalhoEvento.find({})
            .skip(skip)
            .limit(limit)
            .sort({ ANO_DO_TRABALHO: -1 });

        if (!trabalhosEmEventos || trabalhosEmEventos.length === 0) {
            return res.status(404).json({ 
                error: 'Nenhum documento encontrado',
                total: totalDocs
            });
        }

        // Calcular número total de páginas
        const totalPages = Math.ceil(totalDocs / limit);

        res.status(200).json({
            total: totalDocs, // Total geral de documentos
            data: trabalhosEmEventos,
            pagination: {
                page,
                limit,
                totalDocs,
                totalPages,
                hasMore: page < totalPages
            }
        });
    } catch (err) {
        res.status(400).json({ 
            error: 'Erro ao buscar documentos', 
            details: err.message 
        });
    }
}

module.exports = {
    createTodosTrabalhosEmEventos,
    deleteAllTrabalhosEmEventos,
    getAllTrabalhosEmEventos
};
