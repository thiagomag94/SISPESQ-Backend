const mongoose = require('mongoose');
const redis = require('../redis');
const Partituras = require('../models/Partituras');

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

const filterPartiturasDuplicados = async (partituras) =>{
    const batchSize = 1000;
    const seen = new Map()
    const PartiturasUnicas = [];
    const PartiturasDuplicadas = [];

    const normalize = (text = "") =>
        text.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

    const processBatch = async(batch)=>{
        const promises = batch.map(async(partituras) => {
            const doiValido = partituras.DOI && partituras.DOI.trim().length > 0

            const key =  doiValido ? `doi-${normalize(partituras.DOI)}` : `titulo-${normalize(partituras.TITULO)}-year-${partituras.ANO?.toString()}`;
            if(seen.has(key)){
                return {partituras, isDuplicate: true};
            } else {
                seen.set(key, true);
                return {partituras, isDuplicate: false};
            }
        })  

        const results = await Promise.all(promises);
        return results;

    }

    for(let i = 0; i < partituras.length; i += batchSize){
        const batch = partituras.slice(i, i + batchSize);
        const results = await processBatch(batch);

        results.forEach(result =>{
            if(result.isDuplicate){
                PartiturasDuplicadas.push(result.partituras);
            } else {
                PartiturasUnicas.push(result.partituras);
            }
        })
        
    }
    arrayDuplicados = PartiturasDuplicadas
    console.log('Duplicados encontrados:', arrayDuplicados.length);
    return {
        PartiturasUnicas,
        PartiturasDuplicadas
    };
}

const createTodasPartituras = async (req, res) => {
    try{
         // Primeiro remover todos os índices existentes
        const collection = mongoose.connection.db.collection('producao_geral');
        //const indexes = await collection.indexes();
        
        // Remover índices existentes (exceto o _id)
        //for (const index of indexes) {
           // if (index.name !== '_id_') {
                //await collection.dropIndex(index.name);
          //  }
        //}
        // criar indices necessários
        await collection.createIndexes([
            { key: { "producoes.partituras_musicais.DOI": 1 } },
            { key: { "producoes.partituras_musicais.TITULO": 1 } },
            { key: { "producoes.partituras_musicais.ANO": 1 } },
          
           
        ]);
        const pipeline = [
            { $match: { "producoes.partituras_musicais": { $exists: true, $not: { $size: 0 } } } },
            
            { $unwind: "$producoes.partituras_musicais" },
            { $project: { 
                _id: 0,
                ID_LATTES_AUTOR: "$id_lattes",
                DEPARTAMENTO: "$departamento",
                CENTRO: "$centro",
                DOI: "$producoes.partituras_musicais.DOI",
                TITULO: "$producoes.partituras_musicais.TITULO",
                ANO: "$producoes.partituras_musicais.ANO",
                AUTORES: "$producoes.partituras_musicais.AUTORES",
                PALAVRAS_CHAVE: { // Transformar o objeto em um array
                    $filter: {
                        input: [
                            "$producoes.partituras_musicais.PALAVRAS_CHAVE.PALAVRA_CHAVE_1",
                            "$producoes.partituras_musicais.PALAVRAS_CHAVE.PALAVRA_CHAVE_2",
                            "$producoes.partituras_musicais.PALAVRAS_CHAVE.PALAVRA_CHAVE_3",
                            "$producoes.partituras_musicais.PALAVRAS_CHAVE.PALAVRA_CHAVE_4",
                            "$producoes.partituras_musicais.PALAVRAS_CHAVE.PALAVRA_CHAVE_5",
                            "$producoes.partituras_musicais.PALAVRAS_CHAVE.PALAVRA_CHAVE_6"
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

        const { PartiturasUnicas, PartiturasDuplicadas } = await filterPartiturasDuplicados(resultados);

         // Save duplicates to a separate collection
        const duplicatesCollection = mongoose.connection.db.collection('partituras_duplicados');
        await duplicatesCollection.deleteMany({}); // Clear previous duplicates
       if( PartiturasDuplicadas.length > 0) {
            await duplicatesCollection.insertMany(PartiturasDuplicadas);    
         }

        //Limpar a coleção de Partituras
        await Partituras.deleteMany({});

        //salva as produções unicas
        await Partituras.insertMany(PartiturasUnicas);

        res.status(200).json({ 
            message: `${PartiturasUnicas.length} Partituras criadas com sucesso`,
            total: PartiturasUnicas.length ,
            duplicatesCount: PartiturasDuplicadas.length
        });

    }catch(err) {
        console.error('Erro ao criar Partituras:', err);
        res.status(500).json({ 
            error: "Erro ao criar Partiruras", 
            details: err.message 
        });
    }
}

const deleteAllPartituras = async (req, res) => {
    try {
        // Limpa a coleção de Partituras
        const result = await Partituras.deleteMany({});
        
        res.status(200).json({ 
            message: `${result.deletedCount} Partituras deletadas com sucesso` ,
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('Erro ao excluir Partituras ', err);
        res.status(500).json({ 
            error: "Erro ao excluir Partituras", 
            details: err.message 
        });
    }
}

const getTodasPartituras = async (req, res) => {
    try {
        let query = {};
        let filtroData = {};
        //verifica se há filtros na query
        if (req.query.departamento) {
            query.DEPARTAMENTO = req.query.departamento;
        }

        if (req.query.centro) {
            query.CENTRO = req.query.centro;
        }
    
        if(req.query.dataInicio){
            
            const dataInicio = new Date(req.query.dataInicio);
            dataInicio.setHours(0, 0, 0, 0);
            filtroData.$gte = dataInicio; // Maior ou igual a data de início
            if (Object.keys(filtroData).length > 0) {
                query.ANO = filtroData;
            }
            
            
        }

        if(req.query.dataFim){
           
            const dataFim = new Date(req.query.dataFim);
            dataFim.setHours(23, 59, 59, 999);
            filtroData.$lte = dataFim; // Menor ou igual a data de fim
            if (Object.keys(filtroData).length > 0) {
                query.ANO = filtroData;
            }
        }

        console.log('Query de busca de Partituras:', query);

        //primeiro contar todos os documentos
        const totalDocs = await Partituras.countDocuments(query);

        //obter parâmetros de paginação
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10; 
        const skip = (page - 1) * limit;

        //buscar os documentos com os filtros e paginação
        const partituras = await Partituras.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ ANO: -1 }) // Ordenar por ano decrescente
        if(!partituras || partituras.length === 0) {
            return res.status(404).json({ 
                error: "Nenhuma Partituras encontrada com os filtros informados" ,
                total: totalDocs
            });
        }

        //Calcular o total de páginas
        const totalPages = Math.ceil(totalDocs / limit);

        const duplicatesCollection = mongoose.connection.db.collection('partituras_duplicados');
        const duplicates = await duplicatesCollection.find({}).toArray();
        const arrayDuplicados = duplicates;
        
        res.status(200).json({
            total: totalDocs,
            duplicatesCount: arrayDuplicados.length,
            duplicates: arrayDuplicados,
            data: partituras,
            pagination: {
                page,
                limit,
                totalDocs,
                totalPages,
                hasMore: page < totalPages
            }
        });

    } catch (err) {
        console.error('Erro ao obter Partituras', err);
        res.status(500).json({ 
            error: "Erro ao obter Partituras", 
            details: err.message 
        });
    }
}

module.exports = {
    createTodasPartituras,
    deleteAllPartituras,
    getTodasPartituras
};