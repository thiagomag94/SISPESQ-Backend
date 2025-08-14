const mongoose = require('mongoose');
const redis = require('../redis');
const Artigos = require('../models/Artigo');
const ExcelJS = require('exceljs');

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

        if(req.query.issn!==undefined){
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
module.exports = {
    createTodosArtigos,
    getTodosArtigosUFPE,
    deleteAllArtigos,
    getArtigosPorDepartamentoouCentro,
    buscarPorPalavrasChave,
    exportExcelArtigos
};
