const mongoose = require('mongoose');
const redis = require('../redis');
const Artigos = require('../models/Artigo');
const ArtigoUnicoPorDepartamento = require('../models/ArtigoUnicoPorDepartamento');
const ExcelJS = require('exceljs');
const {gerarPlanilhaExcel} = require('./downloadController')
const {gerarPlanilhaExcelStream } = require('./downloadController')

const gerarExcelProducao = require('../utils/gerarExcelArtigos');
const gerarRelatorioGroupBy = require('../utils/gerarRelatorioGroupBy');
const ArtigoUnicosPorDepartamento = require('../models/ArtigoUnicoPorDepartamento');

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

// api/utils/filterArtigosDuplicados.js

const filterArtigosDuplicados = async (artigos, nivel = "global") => {
    const batchSize = 1000;
    const seen = new Map();
    const artigosUnicos = [];
    const artigosDuplicados = [];

    const normalize = (text = "") =>
        text.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

    // --- ETAPA 1: Criar o Mapa de Enriquecimento ---
    const titleYearToDoiMap = new Map();
    for (const artigo of artigos) {
        if (artigo.DOI && artigo.DOI.trim().length > 0) {
            const titleYearKey = `title-${normalize(artigo.TITULO_DO_ARTIGO)}-year-${artigo.ANO_DO_ARTIGO?.toString()}`;
            if (!titleYearToDoiMap.has(titleYearKey)) {
                titleYearToDoiMap.set(titleYearKey, artigo.DOI);
            }
        }
    }

    // --- ETAPA 2: Processar e Filtrar com o Mapa de Enriquecimento ---
    const processBatch = async (batch) => {
        const promises = batch.map(async (artigo) => {
            const doiOriginal = artigo.DOI && artigo.DOI.trim().length > 0 ? artigo.DOI : null;
            
            const titleYearKeyForLookup = `title-${normalize(artigo.TITULO_DO_ARTIGO)}-year-${artigo.ANO_DO_ARTIGO?.toString()}`;
            const doiEnriquecido = titleYearToDoiMap.get(titleYearKeyForLookup);

            const finalIdentifier = doiEnriquecido || doiOriginal;

            // 🔹 Aqui mantemos exatamente sua lógica original:
            const baseKey = finalIdentifier
                ? `doi-${normalize(finalIdentifier)}`
                : titleYearKeyForLookup;

            // 🔹 E só adicionamos o contexto de nível:
            let key;
            if (nivel === "departamento" && artigo.DEPARTAMENTO) {
                key = `dept-${normalize(artigo.DEPARTAMENTO)}-${baseKey}`;
            } else if (nivel === "centro" && artigo.CENTRO) {
                key = `centro-${normalize(artigo.CENTRO)}-${baseKey}`;
            } else {
                key = baseKey; // 🔸 global (mantém exatamente sua estrutura original)
            }

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



const getArtigosUnicosUFPE = async (req, res) => {
    
    try {
        let query = {}
        let filtroData = {};
        // Verifica se há filtros na query
        if (req.query.departamento) {
            query.DEPARTAMENTO = req.query.departamento;
        }

        if (req.query.centro) {
            query.CENTRO = req.query.centro;
        }

        if(req.query.id_lattes){
            query.ID_LATTES_AUTOR = req.query.id_lattes;
        }

        if(req.query.doi){
            query.DOI = req.query.doi;
        }

        if(req.query.dataInicio){
            
            const dataInicio = new Date(req.query.dataInicio);
            dataInicio.setHours(0, 0, 0, 0);
            filtroData.$gte = dataInicio; // Maior ou igual a data de início
            if (Object.keys(filtroData).length > 0) {
                query.ANO_DO_ARTIGO = filtroData;
              } 
            
        }

        if(req.query.dataFim){
           
            const dataFim = new Date(req.query.dataFim);
            dataFim.setHours(23, 59, 59, 999);
            filtroData.$lte = dataFim; // Menor ou igual a data de fim
            if (Object.keys(filtroData).length > 0) {
                query.ANO_DO_ARTIGO = filtroData;
            }
        }

        if(req.query.issn){
            query.ISSN = req.query.issn;
        }

        if(req.query.periodico){
            query.TITULO_DO_PERIODICO_OU_REVISTA = req.query.periodico;
        }

        const groupBy = req.query.groupBy || null; // Pega o parâmetro groupBy, se existir

        console.log('Query de busca de artigos:', query);

        if(groupBy){
            const allowedGroupByFields = {
                issn: '$ISSN',
                periodico: '$TITULO_DO_PERIODICO_OU_REVISTA',
            }
            // Verifica se o groupBy é válido
            const groupField = allowedGroupByFields[groupBy.toLowerCase()];
            
            if (!groupField) {
                return res.status(400).json({ error: "Parâmetro 'groupBy' inválido." });
            }

             // Monta a pipeline de agregação
            const pipeline = [
                // 1. Etapa de filtro: seleciona os documentos relevantes
                { $match: query },

                // 2. Etapa de agrupamento: agrupa pelo campo especificado
                {
                    $group: {
                        _id: groupField, // O campo pelo qual agrupar
                        total_publicacoes: { $sum: 1 } // Conta quantos documentos existem em cada grupo
                    }
                },

                // 3. (Opcional) Etapa de ordenação: ordena os grupos pelo total
                { $sort: { total_publicacoes: -1 } } // -1 para ordem decrescente
            ];
            // Executa a agregação
            const resultado_agrupado = await Artigos.aggregate(pipeline);

            if (!resultado_agrupado || resultado_agrupado.length === 0) {
                return res.status(404).json({ 
                    error: 'Nenhum documento encontrado',
                    total: 0
                });
            }
            // Retorna o resultado da agregação
            return res.status(200).json({
                total: resultado_agrupado.reduce((acc, curr) => acc + curr.total_publicacoes, 0),
                grupos: resultado_agrupado
            });

        }else{
            // Primeiro contar todos os documentos
            const totalDocs = await Artigos.countDocuments(query);
            
            // Obter parâmetros de paginação da query
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 30;
            const skip = (page - 1) * limit;

            // Buscar os documentos paginados
            const artigos = await Artigos.find(query)
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
        }
    } catch (err) {
        console.error('Erro ao buscar artigos:', err);
        res.status(500).json({ 
            error: "Erro ao buscar artigos", 
            details: err.message 
        });
    }
};



const createArtigosUnicosUFPE = async (req, res) => {
    try {
        // Primeiro remover todos os índices existentes
        const collection = mongoose.connection.db.collection('producao_geral');
        const indexes = await collection.indexes();
        
        // Remover índices existentes (exceto o _id)
        for (const index of indexes) {
            if (index.name !== '_id_') {
                await collection.dropIndex(index.name);
            }
        }

        //Criar índices necessários
        await collection.createIndexes([
            { key: { "producoes.artigos.DOI": 1 } },
            { key: { "producoes.artigos.TITULO_DO_ARTIGO": 1 } },
            { key: { "producoes.artigos.ANO_DO_ARTIGO": 1 } },
            { key: { "producoes.artigos.PALAVRAS_CHAVE": "text" } }
           
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
                TITULO_DO_PERIODICO_OU_REVISTA: "$producoes.artigos.TITULO_DO_PERIODICO_OU_REVISTA",
                ISSN: "$producoes.artigos.ISSN",
                AUTORES: "$producoes.artigos.AUTORES",
                PALAVRAS_CHAVE: { // Transformar o objeto em um array
                    $filter: {
                        input: [
                            "$producoes.artigos.PALAVRAS_CHAVE.PALAVRA_CHAVE_1",
                            "$producoes.artigos.PALAVRAS_CHAVE.PALAVRA_CHAVE_2",
                            "$producoes.artigos.PALAVRAS_CHAVE.PALAVRA_CHAVE_3",
                            "$producoes.artigos.PALAVRAS_CHAVE.PALAVRA_CHAVE_4",
                            "$producoes.artigos.PALAVRAS_CHAVE.PALAVRA_CHAVE_5",
                            "$producoes.artigos.PALAVRAS_CHAVE.PALAVRA_CHAVE_6"
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

const createArtigosUnicosDepartamento = async (req, res) => {
    try {
        // Primeiro remover todos os índices existentes
        const collection = mongoose.connection.db.collection('producao_geral');
        const indexes = await collection.indexes();
        
        // Remover índices existentes (exceto o _id)
        for (const index of indexes) {
            if (index.name !== '_id_') {
                await collection.dropIndex(index.name);
            }
        }

        //Criar índices necessários
        await collection.createIndexes([
            { key: { "producoes.artigos.DOI": 1 } },
            { key: { "producoes.artigos.TITULO_DO_ARTIGO": 1 } },
            { key: { "producoes.artigos.ANO_DO_ARTIGO": 1 } },
            { key: { "producoes.artigos.PALAVRAS_CHAVE": "text" } }
           
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
                TITULO_DO_PERIODICO_OU_REVISTA: "$producoes.artigos.TITULO_DO_PERIODICO_OU_REVISTA",
                ISSN: "$producoes.artigos.ISSN",
                AUTORES: "$producoes.artigos.AUTORES",
                PALAVRAS_CHAVE: { // Transformar o objeto em um array
                    $filter: {
                        input: [
                            "$producoes.artigos.PALAVRAS_CHAVE.PALAVRA_CHAVE_1",
                            "$producoes.artigos.PALAVRAS_CHAVE.PALAVRA_CHAVE_2",
                            "$producoes.artigos.PALAVRAS_CHAVE.PALAVRA_CHAVE_3",
                            "$producoes.artigos.PALAVRAS_CHAVE.PALAVRA_CHAVE_4",
                            "$producoes.artigos.PALAVRAS_CHAVE.PALAVRA_CHAVE_5",
                            "$producoes.artigos.PALAVRAS_CHAVE.PALAVRA_CHAVE_6"
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

        const { artigosUnicos, artigosDuplicados } = await filterArtigosDuplicados(resultados, "departamento");
        // Save duplicates to a separate collection
        const duplicatesCollection = mongoose.connection.db.collection('artigos_duplicados_departamento');
        await duplicatesCollection.deleteMany({}); // Clear previous duplicates
        await duplicatesCollection.insertMany(artigosDuplicados);
       
        // Limpa a coleção existente
        await ArtigoUnicoPorDepartamento.deleteMany({});

        // Salva os artigos únicos
        await ArtigoUnicoPorDepartamento.insertMany(artigosUnicos);

        res.status(200).json({
            message: `${artigosUnicos.length} artigos unicos por departamento criados com sucesso`,
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

        const result = await ArtigoUnicosPorDepartamento.aggregate(pipeline);

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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        if (!palavraChave) {
            return res.status(400).json({
                error: 'Palavra-chave é obrigatória'
            });
        }

        // A normalização aqui não é mais estritamente necessária se o índice de texto
        // for configurado para o idioma correto (português), pois ele lida com acentos e case.
        // Manter a normalização no input não prejudica.
        const termoDeBusca = normalize(palavraChave);
        
        // Chave do cache pode ser simplificada
        const cacheKey = `palavras-chave:${termoDeBusca}:${page}:${limit}`;
        try {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                return res.status(200).json(JSON.parse(cachedData));
            }
        } catch (cacheErr) {
            console.warn('Cache Redis não disponível:', cacheErr);
        }

        // O pipeline de agregação agora usa $text e $meta para relevância
        const pipeline = [
            // Estágio 1: Match - A busca principal com o índice de texto
            {
                $match: {
                    $text: {
                        $search: termoDeBusca,
                        $language: 'pt' // Especificar o idioma para melhor stemming
                    }
                }
            },
            
            // Estágio 2: Project - Adicionar o score de relevância e projetar os campos
            {
                $project: {
                    _id: 0,
                    ID_LATTES_AUTOR: 1,
                    TITULO_DO_ARTIGO: 1,
                    PALAVRAS_CHAVE: 1,
                    score: { $meta: "textScore" } // Adiciona o score de relevância
                }
            },

            // Estágio 3: Sort - Ordenar pelos mais relevantes primeiro
            {
                $sort: { score: -1 }
            },

            // Estágio 4: Facet - Para fazer a contagem total e a paginação em uma única query
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $skip: skip }, { $limit: limit }]
                }
            }
        ];

        const result = await Artigos.aggregate(pipeline);
        
        const total = result[0].metadata.length > 0 ? result[0].metadata[0].total : 0;
        const artigosPaginados = result[0].data;

        if (total === 0) {
             return res.status(200).json({
                message: 'Nenhum artigo encontrado para a palavra-chave fornecida',
                total: 0,
                data: [],
                pagination: {
                    page,
                    limit,
                    totalPages: 0,
                    hasMore: false
                }
            });
        }

        // O agrupamento por autor pode ser feito aqui, no lado da aplicação, como antes.
        const autores = {};
        artigosPaginados.forEach(artigo => {
            const autorId = artigo.ID_LATTES_AUTOR;
            if (!autores[autorId]) {
                autores[autorId] = {
                    ID_LATTES_AUTOR: autorId,
                    artigos: []
                };
            }
            autores[autorId].artigos.push(artigo);
        });

        const autoresArray = Object.values(autores);
        const totalPages = Math.ceil(total / limit);

        const response = {
            total,
            data: autoresArray,
            pagination: {
                page,
                limit,
                totalPages,
                hasMore: page < totalPages
            }
        };

        // Salvar no cache
        try {
            await redis.setex(cacheKey, 3600, JSON.stringify(response));
        } catch (cacheErr) {
            console.warn('Cache Redis não disponível:', cacheErr);
        }

        res.status(200).json(response);

    } catch (err) {
        console.error('Erro ao buscar por palavras-chave:', err);
        res.status(500).json({ 
            error: "Erro ao buscar por palavras-chave", 
            details: err.message 
        });
    }
};

const getArtigosUnicosQualis = async (req, res) => {
    try {
        console.log("\n--- INICIANDO REQUISIÇÃO DE ARTIGOS ÚNICOS COM QUALIS ---", req.query);
        // --- CORREÇÃO: Parâmetros relevantes para esta função ---
        const { qualis, departamento, categoria_busca, ano, dataInicio, dataFim, groupBy, page, limit, exportExcel } = req.query;

        // 1. Construção de Filtros Iniciais (APENAS DATA)
        const filtrosArtigoIniciais = {};
        if (ano) {
            const dataBusca = new Date(`${ano}-12-31`);
            filtrosArtigoIniciais.ANO_DO_ARTIGO = { $eq: dataBusca };
        } else if (dataInicio && dataFim) {
            const dtInicio = new Date(dataInicio);
            dtInicio.setHours(0, 0, 0, 0); // Define início do dia local
            const dtFim = new Date(dataFim);
            dtFim.setHours(23, 59, 59, 999); // Define fim do dia local
            filtrosArtigoIniciais.ANO_DO_ARTIGO = { $gte: dtInicio, $lte: dtFim };
}
        if(departamento){
            filtrosArtigoIniciais.DEPARTAMENTO = departamento;
        }
        // Filtro para garantir que ISSN existe e não é vazio/nulo
        const filtroISSN = {'ISSN': { $nin: [null, ""] }}; // --- CORREÇÃO: usa $nin ---

        // 2. Construção da Pipeline Base
        let pipeline = [
            { $match: filtrosArtigoIniciais }, // Aplica filtro de data, se houver
            { $match: filtroISSN },           // Garante que temos ISSN para buscar Qualis
            // Lookups para Qualis
            { $lookup: { from: 'periodicos', localField: 'ISSN', foreignField: 'ISSN', as: 'qualisDireto' } },
            { $lookup: { from: 'relacaoissns', localField: 'ISSN', foreignField: 'EISSN', as: 'relacaoIssn' } },
            // --- ADICIONADO: $unwind ---
          
            { $lookup: { from: 'periodicos', localField: 'relacaoIssn.ISSN', foreignField: 'ISSN', as: 'qualisIndireto' }},
            // Projeto para calcular Qualis/Categoria e manter campos necessários
            { $project: {
                _id: 1, // Mantém _id se precisar para algo
                // CAMPOS NECESSÁRIOS PARA OS GROUP BY DESTA ROTA:
                ISSN: '$ISSN', // Precisa do ISSN para agrupar por ele
                QUALIS: { // --- CORREÇÃO: Adicionado $ifNull ---
                    $ifNull: [
                        { $arrayElemAt: ['$qualisDireto.QUALIS', 0] },
                        { $arrayElemAt: ['$qualisIndireto.QUALIS', 0] },
                        'NAO ENCONTRADO'
                    ]
                },
                CATEGORIA_BUSCA: { // --- CORREÇÃO: Adicionado $ifNull ---
                   $cond: {
                       if: { $and: [ { $gt: [{ $size: { $ifNull: ['$qualisDireto', []] } }, 0] }, { $gt: [{ $size: { $ifNull: ['$qualisIndireto', []] } }, 0] } ] },
                       then: 'BUSCA DIRETA E INDIRETA',
                       else: { $cond: { if: { $gt: [{ $size: { $ifNull: ['$qualisDireto', []] } }, 0] }, then: 'BUSCA DIRETA', else: { $cond: { if: { $gt: [{ $size: { $ifNull: ['$qualisIndireto', []] } }, 0] }, then: 'BUSCA INDIRETA', else: 'COM ISSN MAS NAO ENCONTRADO EM PERIODICOS' } } } }
                   }
                },
                // Mantenha outros campos se precisar para a lista paginada/exportação
                ANO_DO_ARTIGO: 1,
                TITULO_DO_ARTIGO: 1,
                // ID_LATTES_AUTOR: 1, // Não necessário para os groupBys desta rota
                // DEPARTAMENTO: 1,
                // CENTRO: 1,
            }},
            // --- CORREÇÃO: Remove lookup/unwind de researchers ---
            // { $lookup: { from: 'researchers', ... } }, // REMOVIDO
            // { $unwind: { path: '$dadosPesquisador', ... } }, // REMOVIDO
        ];
        console.log("2. Pipeline base construída.");

        // --- CORREÇÃO: Construir e aplicar filtros calculados ANTES do groupBy ---
        const filtrosCalculados = {};
         if (qualis) {
             const listaQualis = qualis.split(',').map(q => q.trim().toUpperCase());
             filtrosCalculados.QUALIS = { $in: listaQualis };
             console.log("Filtro de Qualis a ser aplicado:", filtrosCalculados.QUALIS);
         }
         if (categoria_busca) {
             filtrosCalculados.CATEGORIA_BUSCA = categoria_busca.trim().toUpperCase();
              console.log("Filtro de Categoria a ser aplicado:", filtrosCalculados.CATEGORIA_BUSCA);
         }
         // Adiciona o $match para filtros calculados se houver algum
         if(Object.keys(filtrosCalculados).length > 0) {
             pipeline.push({ $match: filtrosCalculados });
             console.log("3. Filtros calculados (Qualis/Categoria) adicionados.");
         }


        // 4. Bifurcação da Lógica: Estatísticas vs. Lista Paginada/Exportação
        if (groupBy) {
            console.log("4. Modo: ESTATÍSTICAS (groupBy)", groupBy);
            let groupField;
            const groupByLower = groupBy.toLowerCase();

            // --- CORREÇÃO: Cases relevantes para esta rota ---
            switch (groupByLower) {
                case 'categoria_busca': groupField = '$CATEGORIA_BUSCA'; break;
                case 'qualis': groupField = '$QUALIS'; break;
                case 'issn': groupField = '$ISSN'; break; // Agora usa o campo projetado
                // REMOVIDOS cases de departamento, centro, id_lattes
                default: return res.status(400).json({ error: "Parâmetro 'groupBy' inválido para artigos únicos (use qualis, categoria_busca, issn)." });
            }

            // Adiciona a fase de agrupamento
            pipeline.push(
                { $group: { _id: groupField, totalArtigos: { $sum: 1 } } },
                { $sort: { totalArtigos: -1 } }, // Ordena por total
                { $project: { grupo: '$_id', totalArtigos: 1, _id: 0 } }
            );

            console.log("5. Executando pipeline de estatísticas...");
            // --- CORREÇÃO: Executa a pipeline no modelo Artigos ---
            const resultadosPipeline = await Artigos.aggregate(pipeline).allowDiskUse(true);
            console.log("6. Pipeline de estatísticas finalizada.");

            // Adiciona a contagem de artigos sem ISSN (usando apenas filtros de data)
             // --- CORREÇÃO: Usa filtrosArtigoIniciais ---
            const filtroArtigosSemISSN = { 'ISSN': { $in: [null, ""] }, ...filtrosArtigoIniciais };
            const contagemSemISSN = await Artigos.countDocuments(filtroArtigosSemISSN);

            const estatisticasCompletas = [
                ...resultadosPipeline,
                { grupo: 'ARTIGOS SEM ISSN NO LATTES', totalArtigos: contagemSemISSN }
            ];

            console.log("7. Contagem de artigos sem ISSN adicionada.");

             // Exporta ou retorna JSON para estatísticas
             if (exportExcel === 'true') {
                 console.log("8. Exportando estatísticas para Excel.");
                 const cursorFalso = estatisticasCompletas[Symbol.iterator]();
                 // Adapte o tipo na função de exportação se necessário
                 return gerarPlanilhaExcelStream(res, cursorFalso, `estatisticas_unicos_${new Date().toISOString().slice(0, 10)}`, 'estatisticas_geral');
             } else {
                 return res.status(200).json({ estatisticas: estatisticasCompletas });
             }

        } else {
             // --- MODO LISTA PAGINADA / EXPORTAÇÃO ---
             console.log("4. Modo: LISTA");

             if(exportExcel === 'true'){
                  console.log("5. Exportação para Excel (lista) solicitada.");
                  pipeline.push({ $sort: { ANO_DO_ARTIGO: -1, TITULO_DO_ARTIGO: 1 } }); // Ordena antes do cursor
                  const cursor = Artigos.aggregate(pipeline, { allowDiskUse: true }).cursor();
                  console.log("6. Cursor obtido. Gerando planilha Excel...");
                  return gerarPlanilhaExcelStream(res, cursor, `lista_artigos_unicos_${new Date().toISOString().slice(0, 10)}`, 'lista');
             } else {
                  console.log("5. Modo: LISTA PAGINADA");
                  const page = parseInt(req.query.page, 10) || 1;
                  const limit = parseInt(req.query.limit, 10) || 10;
                  const skip = (page - 1) * limit;

                  pipeline.push({
                      $facet: {
                          metadata: [{ $count: 'totalDocs' }],
                          data: [
                             { $sort: { ANO_DO_ARTIGO: -1, TITULO_DO_ARTIGO: 1 } }, // Ordenação
                             { $skip: skip },
                             { $limit: limit }
                          ]
                      }
                  });

                  console.log("6. Executando pipeline de lista paginada...");
                  const resultadoAgregacao = await Artigos.aggregate(pipeline).allowDiskUse(true);
                  console.log("7. Pipeline de lista finalizada. Enviando resposta.");

                  const data = resultadoAgregacao[0]?.data || [];
                  const totalDocs = resultadoAgregacao[0]?.metadata[0]?.totalDocs || 0;
                  const totalPages = Math.ceil(totalDocs / limit);

                  return res.status(200).json({ docs: data, totalDocs, limit, currentPage: page, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 });
             }
        }

    } catch(err){
        console.error('Erro ao buscar artigos únicos com Qualis:', err);
        if (!res.headersSent) {
             res.status(500).json({ error: "Erro ao buscar artigos únicos com Qualis", details: err.message });
        } else {
             res.end();
        }
    }
};

const getArtigosUnicosQualisDepartamento = async (req, res) => {
    try {
        console.log("\n--- INICIANDO REQUISIÇÃO DE ARTIGOS ÚNICOS COM QUALIS ---", req.query);
        // --- CORREÇÃO: Parâmetros relevantes para esta função ---
        const { qualis, departamento, categoria_busca, ano, dataInicio, dataFim, groupBy, page, limit, exportExcel, doi } = req.query;

        // 1. Construção de Filtros Iniciais (APENAS DATA)
        const filtrosArtigoIniciais = {};
        if (ano) {
            const dataBusca = new Date(`${ano}-12-31`);
            filtrosArtigoIniciais.ANO_DO_ARTIGO = { $eq: dataBusca };
        } else if (dataInicio && dataFim) {
            const dtInicio = new Date(dataInicio);
            dtInicio.setHours(0, 0, 0, 0); // Define início do dia local
            const dtFim = new Date(dataFim);
            dtFim.setHours(23, 59, 59, 999); // Define fim do dia local
            filtrosArtigoIniciais.ANO_DO_ARTIGO = { $gte: dtInicio, $lte: dtFim };
}
        if(departamento){
            filtrosArtigoIniciais.DEPARTAMENTO = departamento;
        }

        if(doi){
            filtrosArtigoIniciais.DOI = doi;
        }
        // Filtro para garantir que ISSN existe e não é vazio/nulo
        const filtroISSN = {'ISSN': { $nin: [null, ""] }}; // --- CORREÇÃO: usa $nin ---

        // 2. Construção da Pipeline Base
        let pipeline = [
            { $match: filtrosArtigoIniciais }, // Aplica filtro de data, se houver
            { $match: filtroISSN },           // Garante que temos ISSN para buscar Qualis
            // Lookups para Qualis
            { $lookup: { from: 'periodicos', localField: 'ISSN', foreignField: 'ISSN', as: 'qualisDireto' } },
            { $lookup: { from: 'relacaoissns', localField: 'ISSN', foreignField: 'EISSN', as: 'relacaoIssn' } },
            // --- ADICIONADO: $unwind ---
          
            { $lookup: { from: 'periodicos', localField: 'relacaoIssn.ISSN', foreignField: 'ISSN', as: 'qualisIndireto' }},
            // Projeto para calcular Qualis/Categoria e manter campos necessários
            { $project: {
                _id: 1, // Mantém _id se precisar para algo
                // CAMPOS NECESSÁRIOS PARA OS GROUP BY DESTA ROTA:
                ISSN: '$ISSN', // Precisa do ISSN para agrupar por ele
                QUALIS: { // --- CORREÇÃO: Adicionado $ifNull ---
                    $ifNull: [
                        { $arrayElemAt: ['$qualisDireto.QUALIS', 0] },
                        { $arrayElemAt: ['$qualisIndireto.QUALIS', 0] },
                        'NAO ENCONTRADO'
                    ]
                },
                CATEGORIA_BUSCA: { // --- CORREÇÃO: Adicionado $ifNull ---
                   $cond: {
                       if: { $and: [ { $gt: [{ $size: { $ifNull: ['$qualisDireto', []] } }, 0] }, { $gt: [{ $size: { $ifNull: ['$qualisIndireto', []] } }, 0] } ] },
                       then: 'BUSCA DIRETA E INDIRETA',
                       else: { $cond: { if: { $gt: [{ $size: { $ifNull: ['$qualisDireto', []] } }, 0] }, then: 'BUSCA DIRETA', else: { $cond: { if: { $gt: [{ $size: { $ifNull: ['$qualisIndireto', []] } }, 0] }, then: 'BUSCA INDIRETA', else: 'COM ISSN MAS NAO ENCONTRADO EM PERIODICOS' } } } }
                   }
                },
                // Mantenha outros campos se precisar para a lista paginada/exportação
                ANO_DO_ARTIGO: 1,
                TITULO_DO_ARTIGO: 1,
                ID_LATTES_AUTOR: 1, // 
                 DEPARTAMENTO: 1,
                CENTRO: 1,
                DOI: 1,
            }},
           
            // --- CORREÇÃO: Remove lookup/unwind de researchers ---
            // { $lookup: { from: 'researchers', ... } }, // REMOVIDO
            // { $unwind: { path: '$dadosPesquisador', ... } }, // REMOVIDO
        ];
        console.log("2. Pipeline base construída.");

        // --- CORREÇÃO: Construir e aplicar filtros calculados ANTES do groupBy ---
        const filtrosCalculados = {};
         if (qualis) {
             const listaQualis = qualis.split(',').map(q => q.trim().toUpperCase());
             filtrosCalculados.QUALIS = { $in: listaQualis };
             console.log("Filtro de Qualis a ser aplicado:", filtrosCalculados.QUALIS);
         }
         if (categoria_busca) {
             filtrosCalculados.CATEGORIA_BUSCA = categoria_busca.trim().toUpperCase();
              console.log("Filtro de Categoria a ser aplicado:", filtrosCalculados.CATEGORIA_BUSCA);
         }
         // Adiciona o $match para filtros calculados se houver algum
         if(Object.keys(filtrosCalculados).length > 0) {
             pipeline.push({ $match: filtrosCalculados });
             console.log("3. Filtros calculados (Qualis/Categoria) adicionados.");
         }


        // 4. Bifurcação da Lógica: Estatísticas vs. Lista Paginada/Exportação
        if (groupBy) {
            console.log("4. Modo: ESTATÍSTICAS (groupBy)", groupBy);
            let groupField;
            const groupByLower = groupBy.toLowerCase();

            // --- CORREÇÃO: Cases relevantes para esta rota ---
           let needsStandardPush = true; 

    switch (groupByLower) {
        case 'categoria_busca':
            groupField = '$CATEGORIA_BUSCA';
            break;
        case 'qualis':
            groupField = '$QUALIS';
            break;
        case 'issn':
            groupField = '$ISSN';
            break;
        case 'centro_departamento_qualis':
            // Formato: { "CENTRO 1": { "DEPARTAMENTO X": { A1: 10, ... }, ... }, "CENTRO 2": { ... } }
            needsStandardPush = false; 
            pipeline.push(
                // Etapa 1: Agrupa pela combinação mais granular (Centro, Depto, Qualis)
                {
                    $group: {
                        _id: {
                            centro: "$CENTRO",
                            departamento: "$DEPARTAMENTO",
                            qualis: "$QUALIS"
                        },
                        total: { $sum: 1 }
                    }
                },
                // Etapa 2: Agrupa por Centro/Depto para criar o objeto de Qualis
                {
                    $group: {
                        _id: {
                            centro: "$_id.centro",
                            departamento: "$_id.departamento"
                        },
                        qualisCounts: { $push: { k: "$_id.qualis", v: "$total" } }
                    }
                },
                // Etapa 3: Projeta para transformar o array de qualis em objeto
                {
                    $project: {
                        _id: 0,
                        centro: "$_id.centro",
                        departamento: "$_id.departamento",
                        qualisObj: { $arrayToObject: "$qualisCounts" }
                    }
                },
                // Etapa 4: Agrupa por Centro para criar o objeto de Departamentos
                {
                    $group: {
                        _id: "$centro",
                        departamentos: { $push: { k: "$departamento", v: "$qualisObj" } }
                    }
                },
                // Etapa 5: Projeta para transformar o array de departamentos em objeto
                {
                    $project: {
                        _id: 1, // _id agora é o nome do Centro
                        deptObj: { $arrayToObject: "$departamentos" }
                    }
                },
                // Etapa 6: Agrupa tudo em um único documento
                {
                    $group: {
                        _id: null,
                        centros: { $push: { k: "$_id", v: "$deptObj" } }
                    }
                },
                // Etapa 7: Converte o array final de centros no objeto raiz
                {
                    $replaceRoot: {
                        newRoot: { $arrayToObject: "$centros" }
                    }
                }
            );
            break;
       
        
        
        case 'departamento_qualis':
            // 1. Desativa o push padrão no final
            needsStandardPush = false; 
            
            // 2. Adiciona o pipeline ESPECÍFICO para este caso
            pipeline.push(
                // Etapa 1: Agrupa por departamento E qualis para contar
                {
                    $group: {
                        _id: {
                            departamento: "$DEPARTAMENTO",
                            qualis: "$QUALIS"
                        },
                        total: { $sum: 1 }
                    }
                },
                // Etapa 2: Reagrupa por departamento, criando um array de {k, v} para o qualis
                {
                    $group: {
                        _id: "$_id.departamento", // Agrupa pelo nome do departamento
                        qualisCounts: { // Cria um array
                            $push: {
                                k: "$_id.qualis", // k será o Qualis (A1, A2...)
                                v: "$total"       // v será o total
                            }
                        }
                    }
                },
                // Etapa 3: Converte o array em um objeto
                // Resultado: { _id: "DEPARTAMENTO X", qualisObj: { A1: 10, A2: 5 } }
                {
                    $project: {
                        _id: 1, // Mantém o _id (nome do departamento)
                        qualisObj: { $arrayToObject: "$qualisCounts" }
                    }
                },
                 // Etapa 4: Agrupa *todos* os documentos em um só
                 {
                    $group: {
                        _id: null,
                        departamentos: {
                            $push: {
                                k: "$_id",       // k é o nome do departamento (vindo do _id anterior)
                                v: "$qualisObj"  // v é o objeto { A1: 10, ... }
                            }
                        }
                    }
                },
                // Etapa 5: Converte o array final em objeto e o promove a raiz
                {
                    $replaceRoot: {
                        newRoot: { $arrayToObject: "$departamentos" }
                    }
                }
            );
            break;
            
        default:
            return res.status(400).json({ error: "Parâmetro 'groupBy' inválido (use qualis, categoria_busca, issn, departamento_qualis)." });
    }

    // Adiciona a fase de agrupamento padrão (se não for 'departamento_qualis')
    if (needsStandardPush) {
        pipeline.push(
            { $group: { _id: groupField, totalArtigos: { $sum: 1 } } },
            { $project: { grupo: '$_id', totalArtigos: 1, _id: 0 } }
        );
    }

            console.log("5. Executando pipeline de estatísticas...");
            // --- CORREÇÃO: Executa a pipeline no modelo Artigos ---
            const resultadosPipeline = await ArtigoUnicosPorDepartamento.aggregate(pipeline).allowDiskUse(true);
            console.log("6. Pipeline de estatísticas finalizada.");

            // Adiciona a contagem de artigos sem ISSN (usando apenas filtros de data)
             // --- CORREÇÃO: Usa filtrosArtigoIniciais ---
            const filtroArtigosSemISSN = { 'ISSN': { $in: [null, ""] }, ...filtrosArtigoIniciais };
            const contagemSemISSN = await ArtigoUnicosPorDepartamento.countDocuments(filtroArtigosSemISSN);

            const estatisticasCompletas = [
                ...resultadosPipeline,
                { grupo: 'ARTIGOS SEM ISSN NO LATTES', totalArtigos: contagemSemISSN }
            ];

            console.log("7. Contagem de artigos sem ISSN adicionada.");

             // Exporta ou retorna JSON para estatísticas
             if (exportExcel === 'true') {
                 console.log("8. Exportando estatísticas para Excel.");
                 const cursorFalso = estatisticasCompletas[Symbol.iterator]();
                 // Adapte o tipo na função de exportação se necessário
                const relatorio = gerarRelatorioGroupBy(estatisticasCompletas);
                await gerarExcelProducao(relatorio, res);
             } else {
                 return res.status(200).json({ estatisticas: estatisticasCompletas });
             }

        } else {
             // --- MODO LISTA PAGINADA / EXPORTAÇÃO ---
             console.log("4. Modo: LISTA");

             if(exportExcel === 'true'){
                  console.log("5. Exportação para Excel (lista) solicitada.");
                  pipeline.push({ $sort: { ANO_DO_ARTIGO: -1, TITULO_DO_ARTIGO: 1 } }); // Ordena antes do cursor
                  const cursor = ArtigoUnicosPorDepartamento.aggregate(pipeline, { allowDiskUse: true }).cursor();
                  console.log("6. Cursor obtido. Gerando planilha Excel...");
                  return gerarPlanilhaExcelStream(res, cursor, `lista_artigos_unicos_${new Date().toISOString().slice(0, 10)}`, 'lista');
             } else {
                  console.log("5. Modo: LISTA PAGINADA");
                  const page = parseInt(req.query.page, 10) || 1;
                  const limit = parseInt(req.query.limit, 10) || 10;
                  const skip = (page - 1) * limit;

                  pipeline.push({
                      $facet: {
                          metadata: [{ $count: 'totalDocs' }],
                          data: [
                             { $sort: { ANO_DO_ARTIGO: -1, TITULO_DO_ARTIGO: 1 } }, // Ordenação
                             { $skip: skip },
                             { $limit: limit }
                          ]
                      }
                  });

                  console.log("6. Executando pipeline de lista paginada...");
                  const resultadoAgregacao = await ArtigoUnicosPorDepartamento.aggregate(pipeline).allowDiskUse(true);
                  console.log("7. Pipeline de lista finalizada. Enviando resposta.");

                  const data = resultadoAgregacao[0]?.data || [];
                  const totalDocs = resultadoAgregacao[0]?.metadata[0]?.totalDocs || 0;
                  const totalPages = Math.ceil(totalDocs / limit);

                  return res.status(200).json({ docs: data, totalDocs, limit, currentPage: page, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 });
             }
        }

    } catch(err){
        console.error('Erro ao buscar artigos únicos com Qualis:', err);
        if (!res.headersSent) {
             res.status(500).json({ error: "Erro ao buscar artigos únicos com Qualis", details: err.message });
        } else {
             res.end();
        }
    }
};


const exportExcelArtigos = async (req, res) => {
    try {
        query={}
        if(req.query.issn){
            query.ISSN = req.query.issn;
        }
        if(req.query.periodico){
            query.TITULO_DO_PERIODICO_OU_REVISTA = req.query.periodico;
        }
        const artigos = await Artigos.find(query).sort({ ANO_DO_ARTIGO: -1 });
        
        if (!artigos || artigos.length === 0) {
            return res.status(404).json({ 
                error: 'Nenhum artigo encontrado para exportação' 
            });
        }
       
    } catch (err) {
        console.error('Erro ao exportar artigos:', err);
        res.status(500).json({ 
            error: "Erro ao exportar artigos", 
            details: err.message 
        });
    }
};

const exportExcelArtigosComQualis = async (req, res) => {
    try {
        query={}
        if(req.query.issn){
            query.ISSN = req.query.issn;
        }
        if(req.query.periodico){
            query.TITULO_DO_PERIODICO_OU_REVISTA = req.query.periodico;
        }
        const artigos = await Artigos.find(query).sort({ ANO_DO_ARTIGO: -1 });
        
        if (!artigos || artigos.length === 0) {
            return res.status(404).json({ 
                error: 'Nenhum artigo encontrado para exportação' 
            });
        }
         // 2. Crie a planilha do Excel em memória
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Sua Aplicação';
        workbook.created = new Date();
        
        const worksheet = workbook.addWorksheet('Artigos');

        // 3. Defina as colunas (cabeçalhos) da planilha
        worksheet.columns = [
        { header: 'Título do Artigo', key: 'titulo', width: 50 },
        { header: 'Autores', key: 'autores', width: 40 },
        { header: 'Periódico/Revista', key: 'periodico', width: 30 },
        { header: 'Ano', key: 'ano', width: 10 },
        { header: 'ISSN', key: 'issn', width: 15 },
        { header: 'DOI', key: 'doi', width: 25 },
        { header: 'Departamento', key: 'departamento', width: 20 },
        { header: 'Centro', key: 'centro', width: 15 },
        { header: 'ID Lattes do Autor Principal', key: 'id_lattes', width: 25 },
        ];

        // 4. Adicione os dados (linhas) na planilha
        artigos.forEach(artigo => {
        worksheet.addRow({
            titulo: artigo.TITULO_DO_ARTIGO,
            // O campo AUTORES é um array. Vamos juntar os nomes em uma única string.
            autores: artigo.AUTORES.map(autor => autor.NOME_COMPLETO_DO_AUTOR).join('; '),
            periodico: artigo.TITULO_DO_PERIODICO_OU_REVISTA,
            // Extraindo apenas o ano da data
            ano: new Date(artigo.ANO_DO_ARTIGO).getFullYear(),
            issn: artigo.ISSN,
            doi: artigo.DOI,
            departamento: artigo.DEPARTAMENTO,
            centro: artigo.CENTRO,
            id_lattes: artigo.ID_LATTES_AUTOR
        });
        });

        // 5. Configure os Headers da Resposta para forçar o download
        const dataAtual = new Date().toISOString().slice(0, 10); // Formato YYYY-MM-DD
        res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
        'Content-Disposition',
        `attachment; filename="export_artigos_${dataAtual}.xlsx"`
        );

        // 6. Envie o arquivo para o cliente
        await workbook.xlsx.write(res);
        res.end();
       
        res.status(200).json({
            message: 'Exportação de artigos concluída com sucesso',
            data: artigos
        });
    } catch (err) {
        console.error('Erro ao exportar artigos:', err);
        res.status(500).json({ 
            error: "Erro ao exportar artigos", 
            details: err.message 
        });
    }
};


/**
 * Processa os parâmetros de query para criar filtros MongoDB genéricos.
 * @param {object} queryParams - O objeto req.query.
 * @param {object} artigoFieldMap - Mapeamento de nomes de query para campos do Artigo no DB.
 * @param {object} researcherFieldMap - Mapeamento de nomes de query (sem prefixo) para campos do Researcher no DB.
 * @returns {object} - Contém { filtrosArtigo, filtroPesquisador, filtrosCalculados }.
 */
function processarFiltrosGenericos(queryParams, artigoFieldMap, researcherFieldMap) {
    const filtrosArtigo = {};       // Para campos originais do Artigo/Duplicado
    const filtroPesquisador = {};   // Para campos do Researcher (após $lookup)
    const filtrosCalculados = {};   // Para campos calculados (QUALIS, CATEGORIA_BUSCA)

    // Defina aqui quais campos API devem ser convertidos para Maiúsculas
    // (Verifique se precisa incluir outros campos do Artigo que devem ser maiúsculos)
    const upperCaseArtigoFields = ['departamento', 'centro', 'titulo_do_periodico_ou_revista','doi', 'ano_do_artigo'];
    // (Verifique se precisa incluir outros campos do Pesquisador que devem ser maiúsculos)
    const upperCaseResearcherFields = ['situacaofuncional', 'regimedetrabalho'];

    console.log("Iniciando processamento de filtros genéricos...");

    for (const key in queryParams) {
        // Ignora parâmetros de controle da rota ou tratados manualmente depois
        if (['groupBy', 'page', 'limit', 'exportExcel', 'ano', 'dataInicio', 'dataFim'].includes(key)) {
            // console.log(`Ignorando parâmetro de controle: ${key}`);
            continue;
        }

        const value = queryParams[key];
        // Ignora parâmetros sem valor definido
        if (value === undefined || value === null || value === '') {
            // console.log(`Ignorando parâmetro com valor vazio/nulo: ${key}`);
            continue;
        }

        let targetFilter, fieldMap, fieldKey, sourceUpperCaseFields, fieldPrefix = '', isCalculated = false;

        // Determina o alvo do filtro (Artigo, Pesquisador ou Calculado)
        if (key.startsWith('pesquisador_')) {
            targetFilter = filtroPesquisador;
            fieldMap = researcherFieldMap;
            fieldKey = key.substring('pesquisador_'.length);
            sourceUpperCaseFields = upperCaseResearcherFields;
            fieldPrefix = 'dadosPesquisador.'; // Prefixo para o $match PÓS lookup
             // console.log(`Filtro detectado para Pesquisador: ${fieldKey}`);
        } else {
            fieldKey = key;
            const potentialApiField = fieldKey.split('_')[0]; // Pega a parte antes do operador
            // Verifica se o campo base (antes do _operador) é um campo calculado
            if (['qualis', 'categoria_busca'].includes(potentialApiField)) {
                 targetFilter = filtrosCalculados;
                 fieldMap = artigoFieldMap; // Usa o mesmo mapa para obter o nome do DB
                 isCalculated = true;
                 sourceUpperCaseFields = []; // Uppercase tratado especificamente para estes
                 // console.log(`Filtro detectado para Campo Calculado: ${fieldKey}`);
            } else {
                 targetFilter = filtrosArtigo;
                 fieldMap = artigoFieldMap;
                 sourceUpperCaseFields = upperCaseArtigoFields;
                 // console.log(`Filtro detectado para Artigo: ${fieldKey}`);
            }
        }

        let apiFieldName = fieldKey;
        let operatorSuffix = 'eq'; // Padrão é igualdade

        // Extrai o operador, se houver (ex: _ne, _gt)
        if (fieldKey.includes('_')) {
            const parts = fieldKey.split('_');
            const potentialOp = parts[parts.length - 1].toLowerCase();
            const validOps = ['eq', 'ne', 'in', 'nin', 'gt', 'gte', 'lt', 'lte', 'exists', 'isnull', 'regex', 'startswith', 'endswith'];
            if (validOps.includes(potentialOp)) {
                 operatorSuffix = potentialOp;
                 parts.pop(); // Remove o operador
                 apiFieldName = parts.join('_'); // Recria o nome do campo da API
                 // console.log(`Operador extraído: ${operatorSuffix}, Campo API: ${apiFieldName}`);
            } else {
                 // console.log(`Sufixo "_" encontrado, mas não é um operador válido: ${potentialOp}`);
                 apiFieldName = fieldKey; // Assume que o _ faz parte do nome
            }
        }

        // Mapeia o nome da API para o nome do campo no DB
        const dbFieldNamePart = fieldMap[apiFieldName];
        if (!dbFieldNamePart) {
             console.warn(`Campo API não mapeado ignorado: ${apiFieldName} (de ${key})`);
             continue; // Ignora parâmetros não mapeados
        }

        // Nome final do campo no DB (com prefixo se for pesquisador, sem se for calculado)
        const dbField = isCalculated ? dbFieldNamePart : fieldPrefix + dbFieldNamePart;
        // console.log(`Campo DB final: ${dbField}`);

        let mongoOperator;
        let processedValue = value; // Começa com o valor string da query

        // Processa o valor e define o operador MongoDB baseado no sufixo
        switch (operatorSuffix) {
            case 'in':
            case 'nin':
                mongoOperator = operatorSuffix === 'in' ? '$in' : '$nin';
                processedValue = value.split(',').map(v => v.trim());
                // console.log(`Processado para ${mongoOperator}:`, processedValue);
                break;
            case 'ne':
                mongoOperator = '$ne';
                processedValue = value; // Processa toUpperCase depois, se aplicável
                // console.log(`Processado para ${mongoOperator}:`, processedValue);
                break;
            case 'gt': case 'gte': case 'lt': case 'lte':
                mongoOperator = '$' + operatorSuffix;
                const dateValue = new Date(value);
                // Verifica se parece data E se o campo API é conhecido como data
                 if (!isNaN(dateValue.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value) && ['ingresso', 'dataExclusao', 'ano'].includes(apiFieldName)) {
                    processedValue = dateValue;
                    // console.log(`Processado como Data para ${mongoOperator}:`, processedValue);
                 } else if (!isNaN(parseFloat(value)) && isFinite(value)) { // Senão, tenta número
                    processedValue = Number(value);
                    // console.log(`Processado como Número para ${mongoOperator}:`, processedValue);
                 } else {
                     console.warn(`Valor inválido para operador de comparação ${operatorSuffix}: ${value}. Ignorando ${key}.`);
                     continue; // Ignora valor inválido para gt/gte/lt/lte
                 }
                break;
            case 'exists':
                mongoOperator = '$exists';
                processedValue = value.toLowerCase() === 'true'; // Booleano
                // console.log(`Processado para ${mongoOperator}:`, processedValue);
                break;
            case 'isnull':
                mongoOperator = value.toLowerCase() === 'true' ? '$eq' : '$ne'; // Define $eq ou $ne
                processedValue = null; // O valor comparado é sempre null
                // console.log(`Processado para ${mongoOperator} null`);
                break;
            case 'regex': mongoOperator = '$regex'; processedValue = new RegExp(value, 'i'); /* console.log(`Processado para ${mongoOperator}:`, processedValue); */ break;
            case 'startswith': mongoOperator = '$regex'; processedValue = new RegExp('^' + value, 'i'); /* console.log(`Processado para ${mongoOperator}:`, processedValue); */ break;
            case 'endswith': mongoOperator = '$regex'; processedValue = new RegExp(value + '$', 'i'); /* console.log(`Processado para ${mongoOperator}:`, processedValue); */ break;
            case 'eq':
            default: // Trata 'eq' e casos sem operador
                 if(processedValue.toLowerCase() === 'null'){
                     mongoOperator = '$eq'; // Trata campo=null como { $eq: null }
                     processedValue = null;
                     // console.log(`Processado como ${mongoOperator} null`);
                 } else if (value.includes(',')) {
                     mongoOperator = '$in';
                     processedValue = value.split(',').map(v => v.trim());
                     // console.log(`Processado como ${mongoOperator} (de eq com vírgula):`, processedValue);
                 } else {
                     mongoOperator = '$eq';
                     // Não converte para número aqui, deixa como string ou aplica toUpperCase depois
                     // console.log(`Processado para ${mongoOperator}:`, processedValue);
                 }
                break;
        }

        // Aplica toUpperCase onde necessário (APÓS determinar o valor e operador)
        const needsUpperCase = (isCalculated && ['qualis', 'categoria_busca'].includes(apiFieldName)) || sourceUpperCaseFields.includes(apiFieldName);
        if (needsUpperCase) {
             if (typeof processedValue === 'string' && ['$eq', '$ne'].includes(mongoOperator)) {
                   processedValue = processedValue.toUpperCase();
                   // console.log(`Valor convertido para UpperCase: ${processedValue}`);
             } else if (Array.isArray(processedValue) && ['$in', '$nin'].includes(mongoOperator)) {
                   processedValue = processedValue.map(v => typeof v === 'string' ? v.toUpperCase() : v);
                   // console.log(`Array convertido para UpperCase:`, processedValue);
             }
             // Não aplica para regex, null, exists, numéricos, datas
        }


        // Constrói a query no objeto target correto (filtrosArtigo, filtroPesquisador, filtrosCalculados)
         if (targetFilter[dbField] && typeof targetFilter[dbField] === 'object' && !Array.isArray(targetFilter[dbField]) && targetFilter[dbField] !== null && !(targetFilter[dbField] instanceof Date)) { // Evita modificar Date
            // Adiciona/Sobrescreve o operador específico dentro do objeto existente
            targetFilter[dbField][mongoOperator] = processedValue;
         } else {
             // Cria a condição inicial
             if (mongoOperator === '$eq' && processedValue !== null) {
                targetFilter[dbField] = processedValue; // Igualdade simples
             } else if (mongoOperator === '$eq' && processedValue === null){
                 targetFilter[dbField] = null; // Usa null direto para { campo: null }
             }
              else {
                targetFilter[dbField] = { [mongoOperator]: processedValue }; // Usa objeto para outros operadores
             }
         }
         // console.log(`Filtro adicionado a ${isCalculated ? 'filtrosCalculados' : (fieldPrefix ? 'filtroPesquisador' : 'filtrosArtigo')}:`, JSON.stringify(targetFilter[dbField]));

    } // Fim do loop for

    console.log("Processamento de filtros genéricos concluído.");
    return { filtrosArtigo, filtroPesquisador, filtrosCalculados };
}

const artigosComQualis = async (req, res) => {
    try {
        console.log("\n--- INICIANDO REQUISIÇÃO (Função com União - Focada) ---", req.query);
        // --- REMOVIDO: exportExcel ---
        const { ano, groupBy, dataInicio, dataFim,exportExcel, doi } = req.query;

        // --- Definição dos Mapas ANTES ---
        const artigoFieldMap = {
            departamento: 'DEPARTAMENTO', id_lattes: 'ID_LATTES_AUTOR', centro: 'CENTRO', ano: 'ANO_DO_ARTIGO',
            issn: 'ISSN', titulo: 'TITULO_DO_ARTIGO', periodico: 'TITULO_DO_PERIODICO_OU_REVISTA', doi: 'DOI',
            qualis: 'QUALIS', categoria_busca: 'CATEGORIA_BUSCA'
        };
        const researcherFieldMap = {
            situacaofuncional: 'SITUACAO_FUNCIONAL', ingresso: 'DATA_INGRESSO_UFPE',
            regimedetrabalho: 'REGIME_DE_TRABALHO', nome: 'PESQUISADOR', dataExclusao: 'DATA_EXCLUSAO_UFPE', 
        };

        // --- Processa Filtros Genéricos ---
        const { filtrosArtigo, filtroPesquisador, filtrosCalculados } = processarFiltrosGenericos(req.query, artigoFieldMap, researcherFieldMap);

        console.log("Filtros Artigo Gerados:", JSON.stringify(filtrosArtigo, null, 2));
        console.log("Filtro Pesquisador Gerado:", JSON.stringify(filtroPesquisador, null, 2));
        console.log("Filtros Calculados Gerados:", JSON.stringify(filtrosCalculados, null, 2));

        // --- Tratamento Específico de Data do Artigo ---
        if (ano) {
             const dataBusca = new Date(`${ano}-12-31T00:00:00.000Z`);
             filtrosArtigo['ANO_DO_ARTIGO'] = { $eq: dataBusca };
        } else if (dataInicio && dataFim) {
             const range = { $gte: new Date(dataInicio), $lte: new Date(dataFim) };
             filtrosArtigo['ANO_DO_ARTIGO'] = { ...(filtrosArtigo['ANO_DO_ARTIGO'] || {}), ...range };
        }

        if(doi){
            filtrosArtigo['DOI'] = doi;
        }

        // --- CONSTRUÇÃO DA PIPELINE (SEMPRE COM UNIÃO) ---
        let pipeline = [
            { $match: filtrosArtigo }, // Filtro inicial artigo (SEM ISSN)
            { $unionWith: { // União
                coll: 'artigos_duplicados',
                pipeline: [ { $match: filtrosArtigo } ]
              }
            },

            // Busca Qualis (com unwind)
            { $lookup: { from: 'periodicos', localField: 'ISSN', foreignField: 'ISSN', as: 'qualisDireto' } },
            { $lookup: { from: 'relacaoissns', localField: 'ISSN', foreignField: 'EISSN', as: 'relacaoIssn' } },

            { $lookup: { from: 'periodicos', localField: 'relacaoIssn.ISSN', foreignField: 'ISSN', as: 'qualisIndireto' }},
            { $project: { // Projeta campos necessários para filtros e grupos
                _id: 1, // Mantém _id original
                ID_LATTES_AUTOR: 1, DEPARTAMENTO: 1, CENTRO: 1, ANO_DO_ARTIGO: 1, TITULO_DO_ARTIGO: 1, ISSN: '$ISSN', DOI: 1,
                // Garante robustez no cálculo do Qualis
                QUALIS: { $ifNull: [ { $arrayElemAt: ['$qualisDireto.QUALIS', 0] }, { $arrayElemAt: ['$qualisIndireto.QUALIS', 0] }, 'NAO ENCONTRADO' ] },
                // Garante robustez no cálculo da Categoria
                CATEGORIA_BUSCA: { $cond: { if: { $and: [ { $gt: [{ $size: { $ifNull: ['$qualisDireto', []] } }, 0] }, { $gt: [{ $size: { $ifNull: ['$qualisIndireto', []] } }, 0] } ] }, then: 'BUSCA DIRETA E INDIRETA', else: { $cond: { if: { $gt: [{ $size: { $ifNull: ['$qualisDireto', []] } }, 0] }, then: 'BUSCA DIRETA', else: { $cond: { if: { $gt: [{ $size: { $ifNull: ['$qualisIndireto', []] } }, 0] }, then: 'BUSCA INDIRETA', else: 'COM ISSN MAS NAO ENCONTRADO EM PERIODICOS' } } } } } },
            }},

            // NEW: Lookup CANÔNICO do pesquisador (retorna no máximo 1 registro por artigo)
            // Critério: preferir registro com SITUACAO_FUNCIONAL="ATIVO PERMANENTE" E DATA_EXCLUSAO_UFPE == null
            // Fallback: pegar registro mais recente (pela DATA_EXCLUSAO_UFPE decrescente)
            {
                $lookup: {
                    from: 'researchers',
                    let: { id_lattes_author: '$ID_LATTES_AUTOR' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$ID_Lattes', '$$id_lattes_author'] } } },
                        // marca preferência
                        {
                            $addFields: {
                                _prefScore: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $eq: ['$SITUACAO_FUNCIONAL', 'ATIVO PERMANENTE'] },
                                                { $eq: ['$DATA_EXCLUSAO_UFPE', null] }
                                            ]
                                        },
                                        0, // melhor pontuação
                                        1  // menos preferível
                                    ]
                                }
                            }
                        },
                        // ordena por preferência (0 primeiro) e depois por DATA_EXCLUSAO_UFPE (mais recente primeiro)
                        { $sort: { _prefScore: 1, DATA_EXCLUSAO_UFPE: -1, DATA_INGRESSO_UFPE: -1 } },
                        { $limit: 1 },
                        // remove campo temporário
                        { $project: { _prefScore: 0 } }
                    ],
                    as: 'dadosPesquisador'
                }
            },
            // transforma array retorno (0 ou 1) em documento
            { $unwind: { path: '$dadosPesquisador', preserveNullAndEmptyArrays: true } },
            // Calcula e embute o STATUS CANÔNICO dentro de dadosPesquisador
            {
            $addFields: {
                'dadosPesquisador.statusCanonico': {
                $cond: [
                    {
                    $and: [
                        { $eq: ['$dadosPesquisador.SITUACAO_FUNCIONAL', 'ATIVO PERMANENTE'] },
                        {
                        $or: [
                            { $eq: ['$dadosPesquisador.DATA_EXCLUSAO_UFPE', null] },
                            { $eq: ['$dadosPesquisador.DATA_EXCLUSAO_UFPE', undefined] }
                        ]
                        }
                    ]
                    },
                    'ATIVO',
                    'INATIVO'
                ]
                }
            }
            },
            
            // Aplica Filtro Pesquisador (SE HOUVER) - filtro já mapeado por processarFiltrosGenericos
            { $match: filtroPesquisador },

            // Aplica Filtros Calculados (SE HOUVER)
            { $match: filtrosCalculados },
        ];
        console.log("2. Pipeline base (com união e filtros pós-lookups) construída.");

        // --- BIFURCAÇÃO FINAL: GroupBy ou Lista Paginada ---
        const groupByLower = groupBy ? groupBy.toLowerCase() : null;

        if (groupBy) {
            console.log(`4. Modo: ESTATÍSTICAS (groupBy: ${groupBy})`);
            let firstGroupId, secondGroupId, finalProjectFields, sortFields;

            // Define dinamicamente as chaves de agrupamento e projeção
            switch (groupByLower) {
                case 'id_lattes':
                case 'id_lattes_departamento': // Mantém opções compostas se desejar mais granularidade Lattes
                case 'id_lattes_centro':
                case 'id_lattes_categoria_busca':
                    // --- LÓGICA DE AGRUPAMENTO DUPLO PARA ID_LATTES ---
                    firstGroupId = { id_lattes: '$ID_LATTES_AUTOR', qualis: '$QUALIS' };
                    secondGroupId = '$_id.id_lattes';
                    finalProjectFields = { _id: 0, id_lattes: '$_id', producao: '$producao', dadosDocente: '$docenteDados', statusCanonico: '$docenteDados.statusCanonico' };
                    sortFields = { id_lattes: 1 };
                    if (groupByLower === 'id_lattes_departamento') {
                        firstGroupId.departamento = '$DEPARTAMENTO'; secondGroupId = { id_lattes: '$_id.id_lattes', departamento: '$_id.departamento' };
                        finalProjectFields = { _id: 0, id_lattes: '$_id.id_lattes', departamento: '$_id.departamento', producao: '$producao', dadosDocente: '$docenteDados', statusCanonico: '$docenteDados.statusCanonico' };
                        sortFields = { id_lattes: 1, departamento: 1 };
                    } else if (groupByLower === 'id_lattes_centro') {
                        firstGroupId.centro = '$CENTRO'; secondGroupId = { id_lattes: '$_id.id_lattes', centro: '$_id.centro' };
                        finalProjectFields = { _id: 0, id_lattes: '$_id.id_lattes', centro: '$_id.centro', producao: '$producao', dadosDocente: '$docenteDados', statusCanonico: '$docenteDados.statusCanonico' };
                        sortFields = { id_lattes: 1, centro: 1 };
                    } else if (groupByLower === 'id_lattes_categoria_busca') {
                        firstGroupId.categoria_busca = '$CATEGORIA_BUSCA'; secondGroupId = { id_lattes: '$_id.id_lattes', categoria_busca: '$_id.categoria_busca' };
                        finalProjectFields = { _id: 0, id_lattes: '$_id.id_lattes', categoria_busca: '$_id.categoria_busca', producao: '$producao', dadosDocente: '$docenteDados', statusCanonico: '$docenteDados.statusCanonico' };
                        sortFields = { id_lattes: 1, categoria_busca: 1 };
                    }

                    // Observação: como cada artigo agora tem no máximo 1 `dadosPesquisador` canônico (lookup pipeline),
                    // o group por id_lattes não vai inflar a contagem por causa de múltiplos registros de researcher.
                   pipeline.push(
                        // 1) agrupa por (id_lattes + qualis) — mantém primeiro docentePesquisador do grupo e puxa também o statusCanonico diretamente
                        {
                            $group: {
                            _id: firstGroupId,
                            total: { $sum: 1 },
                            docenteDados: { $first: '$dadosPesquisador' },
                            _statusCanonico: { $first: '$dadosPesquisador.statusCanonico' } // garante persistência do status no grupo inicial
                            }
                        },
                        // 2) agrupa por id_lattes (ou id_lattes + departamento/centro) agregando os qualis
                        {
                            $group: {
                            _id: secondGroupId,
                            producao: { $push: { qualis: '$_id.qualis', total: '$total' } },
                            docenteDados: { $first: '$docenteDados' },
                            statusCanonicoAgregado: { $first: '$_statusCanonico' } // carrega o status já preservado
                            }
                        },
                        // 3) projeto final — agora referenciamos statusCanonicoAgregado (seguro) em vez de depender apenas de docenteDados
                        {
                            $project: Object.assign({}, finalProjectFields, { statusCanonico: '$statusCanonicoAgregado' })
                        },
                        { $sort: sortFields }
                        );

                    break; // Fim do case id_lattes*

                case 'departamento':
                case 'centro':
                    // --- CORREÇÃO: LÓGICA DE AGRUPAMENTO DUPLO PARA DEPARTAMENTO/CENTRO ---
                    const groupKeyField = (groupByLower === 'departamento') ? '$DEPARTAMENTO' : '$CENTRO';
                    const groupKeyName = groupByLower; // 'departamento' or 'centro'

                    firstGroupId = { grupoPrincipal: groupKeyField, qualis: '$QUALIS' };
                    secondGroupId = '$_id.grupoPrincipal';
                    finalProjectFields = { _id: 0, [groupKeyName]: '$_id', producao: '$producao' }; // Usa nome dinâmico
                    sortFields = { [groupKeyName]: 1 }; // Ordena pelo campo principal

                     // Adiciona etapas do agrupamento duplo (sem dadosDocente aqui)
                     pipeline.push(
                         // Primeiro group: Conta por Unidade (Depto/Centro) E Qualis
                         {
                             $group: {
                                 _id: firstGroupId,
                                 total: { $sum: 1 }
                                 // Não precisamos preservar dadosDocente aqui
                             }
                         },
                         // Segundo group: Agrupa Qualis sob a Unidade
                         {
                             $group: {
                                 _id: secondGroupId, // Agrupa por Depto ou Centro
                                 producao: {
                                     $push: {
                                         qualis: '$_id.qualis',
                                         total: '$total'
                                     }
                                 }
                                 // Não precisamos passar dadosDocente adiante
                             }
                         },
                         // Projeto Final
                         { $project: finalProjectFields },
                         // Ordenação
                         { $sort: sortFields }
                     );
                    break; // Fim do case departamento/centro
                case 'qualis':
                    // --- AGRUPAMENTO SIMPLES POR QUALIS ---
                    pipeline.push(
                        {
                            $group: {
                                _id: '$QUALIS',
                                total: { $sum: 1 }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                qualis: '$_id',
                                total: 1
                            }
                        }
                    );
                    break;

                default:
                    return res.status(400).json({ error: `Parâmetro 'groupBy=${groupBy}' inválido ou não aplicável a esta rota. Use 'id_lattes*', 'departamento' ou 'centro'.` });
            }

            // --- Execução e Resposta para GroupBy (JSON) ---
            console.log("5. Executando pipeline de estatísticas...");
            // console.log("Pipeline Final:", JSON.stringify(pipeline, null, 2)); // Descomente para depurar
            const resultados = await Artigos.aggregate(pipeline, { allowDiskUse: true });
            console.log("6. Pipeline de estatísticas finalizada.");
           
            if (exportExcel === 'true') {
                console.log("7. Gerando relatório consolidado e exportando Excel...");
                const relatorio = gerarRelatorioGroupBy(resultados);
                await gerarExcelProducao(relatorio, res);
                return; // Importante para não continuar a execução
            }

            return res.status(200).json({ estatisticas: resultados });



         
          

        } else {
            // --- MODO LISTA PAGINADA (SEM GROUPBY) ---
            console.log("4. Modo: LISTA PAGINADA");
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const skip = (page - 1) * limit;

            pipeline.push({
                $facet: {
                    metadata: [{ $count: 'totalDocs' }],
                    data: [
                       { $sort: { ANO_DO_ARTIGO: -1, TITULO_DO_ARTIGO: 1 } },
                       { $skip: skip }, { $limit: limit }
                     ]
                }
            });

            console.log("5. Executando pipeline de lista paginada...");
            const resultadoAgregacao = await Artigos.aggregate(pipeline, { allowDiskUse: true });
            console.log("6. Pipeline de lista finalizada.");

            const data = resultadoAgregacao[0]?.data || [];
            const totalDocs = resultadoAgregacao[0]?.metadata[0]?.totalDocs || 0;
            const totalPages = Math.ceil(totalDocs / limit);
            return res.status(200).json({ docs: data, totalDocs, limit, currentPage: page, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 });
        } // Fim do else (sem groupBy)

    } catch (error) {
         console.error("ERRO FATAL NA AGREGAÇÃO:", error);
         if (!res.headersSent) {
              res.status(500).json({ error: "Erro interno no servidor", details: error.message });
         } else { res.end(); }
    }
};


// module.exports = { artigosComQualis }; // Exporte apenas o controller principal

module.exports = {
    createArtigosUnicosUFPE,
    createArtigosUnicosDepartamento,
    getArtigosUnicosUFPE,
    deleteAllArtigos,
    getArtigosPorDepartamentoouCentro,
    buscarPorPalavrasChave,
    exportExcelArtigos,
    artigosComQualis,
    getArtigosUnicosQualis,
    getArtigosUnicosQualisDepartamento,
};
