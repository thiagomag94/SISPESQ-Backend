const mongoose = require('mongoose');
const redis = require('../redis');
const OutrasProducoesBibliograficas = require('../models/OutrasProducoesBibliograficas');

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

const filterOutrasProducoesBibliograficasDuplicados = async (outras_producoes_bibliograficas) =>{
    const batchSize = 1000;
    const seen = new Map()
    const OutrasProducoesBibliograficasUnicas = [];
    const OutrasProducoesBibliograficasDuplicadas = [];

    const normalize = (text = "") =>
        text.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

    const processBatch = async(batch)=>{
        const promises = batch.map(async(outras_producoes_bibliograficas) => {
            const doiValido = outras_producoes_bibliograficas.DOI && outras_producoes_bibliograficas.DOI.trim().length > 0

            const key =  doiValido ? `doi-${normalize(outras_producoes_bibliograficas.DOI)}` : `titulo-${normalize(outras_producoes_bibliograficas.TITULO)}-year-${outras_producoes_bibliograficas.ANO?.toString()}`;
            if(seen.has(key)){
                return {outras_producoes_bibliograficas, isDuplicate: true};
            } else {
                seen.set(key, true);
                return {outras_producoes_bibliograficas, isDuplicate: false};
            }
        })  

        const results = await Promise.all(promises);
        return results;

    }

    for(let i = 0; i < outras_producoes_bibliograficas.length; i += batchSize){
        const batch = outras_producoes_bibliograficas.slice(i, i + batchSize);
        const results = await processBatch(batch);

        results.forEach(result =>{
            if(result.isDuplicate){
                OutrasProducoesBibliograficasDuplicadas.push(result.outras_producoes_bibliograficas);
            } else {
                OutrasProducoesBibliograficasUnicas.push(result.outras_producoes_bibliograficas);
            }
        })
        
    }
    arrayDuplicados = OutrasProducoesBibliograficasDuplicadas
    console.log('Duplicados encontrados:', arrayDuplicados.length);
    return {
        OutrasProducoesBibliograficasUnicas,
        OutrasProducoesBibliograficasDuplicadas
    };
}

const createTodasOutrasProducoesBibliograficas = async (req, res) => {
    try{
         // Primeiro remover todos os índices existentes
        const collection = mongoose.connection.db.collection('producao_geral');
        const indexes = await collection.indexes();
        
        // Remover índices existentes (exceto o _id)
        for (const index of indexes) {
            if (index.name !== '_id_') {
                await collection.dropIndex(index.name);
            }
        }
        // criar indices necessários
        await collection.createIndexes([
            { key: { "producoes.outras_producoes_bibliograficas.DOI": 1 } },
            { key: { "producoes.outras_producoes_bibliograficas.TITULO": 1 } },
            { key: { "producoes.outras_producoes_bibliograficas.ANO": 1 } },
            { key: { "producoes.outras_producoes_bibliograficas.PALAVRAS_CHAVE": "text" } }
           
        ]);
        const pipeline = [
            { $match: { "producoes.outras_producoes_bibliograficas": { $exists: true, $not: { $size: 0 } } } },
            
            { $unwind: "$producoes.outras_producoes_bibliograficas" },
            { $project: { 
                _id: 0,
                ID_LATTES_AUTOR: "$id_lattes",
                DEPARTAMENTO: "$departamento",
                CENTRO: "$centro",
                DOI: "$producoes.outras_producoes_bibliograficas.DOI",
                TITULO: "$producoes.outras_producoes_bibliograficas.TITULO",
                ANO: "$producoes.outras_producoes_bibliograficas.ANO",
                AUTORES: "$producoes.outras_producoes_bibliograficas.AUTORES",
                PALAVRAS_CHAVE: { // Transformar o objeto em um array
                    $filter: {
                        input: [
                            "$producoes.outras_producoes_bibliograficas.PALAVRAS_CHAVE.PALAVRA_CHAVE_1",
                            "$producoes.outras_producoes_bibliograficas.PALAVRAS_CHAVE.PALAVRA_CHAVE_2",
                            "$producoes.outras_producoes_bibliograficas.PALAVRAS_CHAVE.PALAVRA_CHAVE_3",
                            "$producoes.outras_producoes_bibliograficas.PALAVRAS_CHAVE.PALAVRA_CHAVE_4",
                            "$producoes.outras_producoes_bibliograficas.PALAVRAS_CHAVE.PALAVRA_CHAVE_5",
                            "$producoes.outras_producoes_bibliograficas.PALAVRAS_CHAVE.PALAVRA_CHAVE_6"
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

        const { OutrasProducoesBibliograficasUnicas, OutrasProducoesBibliograficasDuplicadas } = await filterOutrasProducoesBibliograficasDuplicados(resultados);

         // Save duplicates to a separate collection
        const duplicatesCollection = mongoose.connection.db.collection('outras_producoes_bibliograficas_duplicados');
        await duplicatesCollection.deleteMany({}); // Clear previous duplicates
        await duplicatesCollection.insertMany(OutrasProducoesBibliograficasDuplicadas);

        //Limpar a coleção de OutrasProducoesBibliograficas
        await OutrasProducoesBibliograficas.deleteMany({});

        //salva as produções unicas
        await OutrasProducoesBibliograficas.insertMany(OutrasProducoesBibliograficasUnicas);

        res.status(200).json({ 
            message: `${OutrasProducoesBibliograficasUnicas.length} outras producoes bibliograficas criadas com sucesso`,
            total: OutrasProducoesBibliograficasUnicas.length ,
            duplicatesCount: OutrasProducoesBibliograficasDuplicadas.length
        });

    }catch(err) {
        console.error('Erro ao criar outras producoes bibliograficas:', err);
        res.status(500).json({ 
            error: "Erro ao criar outras producoes bibliograficas", 
            details: err.message 
        });
    }
}

const deleteAllOutrasProducoesBibliograficas = async (req, res) => {
    try {
        // Limpa a coleção de OutrasProducoesBibliograficas
        const result = await OutrasProducoesBibliograficas.deleteMany({});
        
        res.status(200).json({ 
            message: `${result.deletedCount} outras producoes bibliograficas deletadas com sucesso` ,
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('Erro ao excluir outras producoes bibliograficas ', err);
        res.status(500).json({ 
            error: "Erro ao excluir outras producoes bibliograficas", 
            details: err.message 
        });
    }
}

const getTodasOutrasProducoesBibliograficas = async (req, res) => {
    try {
        let query={}
        //verifica se há filtros na query
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
                query.ANO = filtroData;
            }
            
            
        }

        console.log('Query de busca de outras producoes bibliograficas:', query);

        //primeiro contar todos os documentos
        const totalDocs = await OutrasProducoesBibliograficas.countDocuments(query);

        //obter parâmetros de paginação
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10; 
        const skip = (page - 1) * limit;

        //buscar os documentos com os filtros e paginação
        const outrasProducoesBibliograficas = await OutrasProducoesBibliograficas.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ ANO: -1 }) // Ordenar por ano decrescente
        if(!outrasProducoesBibliograficas || outrasProducoesBibliograficas.length === 0) {
            return res.status(404).json({ 
                error: "Nenhuma outra producao bibliografica encontrada com os filtros informados" ,
                total: totalDocs
            });
        }

        //Calcular o total de páginas
        const totalPages = Math.ceil(totalDocs / limit);

        const duplicatesCollection = mongoose.connection.db.collection('outras_producoes_bibliograficas_duplicados');
        const duplicates = await duplicatesCollection.find({}).toArray();
        const arrayDuplicados = duplicates;
        
        res.status(200).json({
            total: totalDocs,
            duplicatesCount: arrayDuplicados.length,
            duplicates: arrayDuplicados,
            data: outrasProducoesBibliograficas,
            pagination: {
                page,
                limit,
                totalDocs,
                totalPages,
                hasMore: page < totalPages
            }
        });

    } catch (err) {
        console.error('Erro ao obter outras producoes bibliograficas', err);
        res.status(500).json({ 
            error: "Erro ao obter outras producoes bibliograficas", 
            details: err.message 
        });
    }
}

module.exports = {
    createTodasOutrasProducoesBibliograficas,
    deleteAllOutrasProducoesBibliograficas,
    getTodasOutrasProducoesBibliograficas
};