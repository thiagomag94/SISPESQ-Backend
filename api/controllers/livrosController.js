const mongoose = require('mongoose');
const Livro = require('../models/Livro');

// Function to filter duplicates
const filterLivrosDuplicados = async (livros) => {
    const batchSize = 1000;
    const seen = new Map();
    const livrosUnicos = [];
    const livrosDuplicados = [];

    const processBatch = async (batch) => {
        const promises = batch.map(async (livro) => {
            const isbnValido = livro.ISBN && livro.ISBN.trim().length > 0;

            // Normalize function to handle special characters and accents
            const normalize = (text) => {
                if (!text) return '';
                return text
                    .trim()
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "") // Remove accents
                    .replace(/[^\w\s]/gi, '') // Remove special characters
                    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                    .trim();
            };

            const key = isbnValido
                ? `isbn-${normalize(livro.ISBN)}`
                : `title-${normalize(livro.TITULO_DO_LIVRO)}-year-${normalize(livro.ANO?.toString())}-editora-${normalize(livro.NOME_DA_EDITORA)}`;

            if (seen.has(key)) {
                return { livro, isDuplicate: true };
            } else {
                seen.set(key, livro);
                return { livro, isDuplicate: false };
            }
        });

        return await Promise.all(promises);
    };

    for (let i = 0; i < livros.length; i += batchSize) {
        const batch = livros.slice(i, i + batchSize);
        const results = await processBatch(batch);

        results.forEach(result => {
            if (result.isDuplicate) {
                livrosDuplicados.push(result.livro);
            } else {
                livrosUnicos.push(result.livro);
            }
        });
    }

    return { livrosUnicos, livrosDuplicados };
};

// Function to create all data from producao_geral
const createTodosLivros = async (req, res) => {
    try {
        // Create indexes if they don't exist
        await mongoose.connection.db.collection('producao_geral').createIndexes([
            { key: { "producoes.livros": 1 } },
            { key: { "producoes.livros.TITULO_DO_LIVRO": 1 } },
            { key: { "producoes.livros.ANO": 1 } }
        ]);

        const pipeline = [
            { $match: { "producoes.livros": { $exists: true, $not: { $size: 0 } } } },
            { $unwind: "$producoes.livros" },
            { $project: { 
                _id: 0,
                ID_LATTES_AUTOR: "$id_lattes", 
                TITULO_DO_LIVRO: "$producoes.livros.TITULO_DO_LIVRO",
                ANO: "$producoes.livros.ANO",
                ISBN: "$producoes.livros.ISBN",
                NOME_DA_EDITORA: "$producoes.livros.NOME_DA_EDITORA",
                AUTORES: "$producoes.livros.AUTORES"
            } }
        ];

        const producaoGeralCollection = mongoose.connection.db.collection('producao_geral');
        const cursor = await producaoGeralCollection.aggregate(pipeline).batchSize(1000);
        
        const resultados = [];
        for await (const doc of cursor) {
            resultados.push(doc);
        }
        
        console.log(`Total de documentos antes do filtro: ${resultados.length}`);
        
        // Filter duplicates and save both unique and duplicates
        const { livrosUnicos, livrosDuplicados } = await filterLivrosDuplicados(resultados);
        
        console.log(`Total de documentos únicos após filtro: ${livrosUnicos.length}`);
        console.log(`Total de documentos duplicados: ${livrosDuplicados.length}`);

        // Save duplicates to a separate collection
        const duplicatesCollection = mongoose.connection.db.collection('livros_duplicados');
        await duplicatesCollection.deleteMany({}); // Clear previous duplicates
        await duplicatesCollection.insertMany(livrosDuplicados);

        // Save unique works to Livro collection
        try {
            const insertResult = await Livro.insertMany(livrosUnicos, { ordered: false });
            
            console.log(`Total de documentos salvos no MongoDB: ${insertResult.length}`);
            
            res.status(200).json({ 
                message: `${insertResult.length} Livros criados com sucesso`,
                totalTentativas: livrosUnicos.length,
                totalFalhas: livrosUnicos.length - insertResult.length
            });
        } catch (err) {
            // Handle bulk write errors
            if (err.name === 'BulkWriteError') {
                console.error('Erro ao salvar livros:', err);
                
                // Extract failed documents from error
                const failedDocuments = err.result.writeErrors.map(error => error.err.op);
                
                console.error(`Falha ao salvar ${failedDocuments.length} documentos:`);
                failedDocuments.forEach((doc, index) => {
                    console.error(`Documento ${index + 1}:`);
                    console.error('ID_LATTES_AUTOR:', doc.ID_LATTES_AUTOR);
                    console.error('TITULO_DO_LIVRO:', doc.TITULO_DO_LIVRO);
                    console.error('ANO:', doc.ANO);
                    console.error('ISBN:', doc.ISBN);
                    console.error('----------------------------------------');
                });
                
                // Include error details in response
                const errorDetails = {
                    totalFalhas: failedDocuments.length,
                    erros: err.result.writeErrors.map(error => ({
                        mensagem: error.err.msg,
                        documentoId: error.err.op._id.toString()
                    }))
                };
                
                throw {
                    status: 500,
                    message: 'Falha ao salvar alguns documentos',
                    details: errorDetails
                };
            }
            
            console.error('Erro ao salvar livros:', err);
            throw err;
        }
    } catch (err) {
        console.error('Erro ao buscar livros:', err);
        throw err;
    }
};

// Function to delete all livros
const deleteAllLivros = async (req, res) => {
    try {
        const deleteLivros = await Livro.deleteMany({});
        
        if (!deleteLivros) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        res.status(200).json({ message: 'Livros excluídos com sucesso' });
    } catch (err) {
        res.status(400).json({ error: 'Erro ao excluir livros', details: err });
    }
};

// Function to get all livros with pagination
const getAllLivros = async (req, res) => {
    try {
        // Get search parameters
        const titulo = req.query.titulo?.trim();
        const isbn = req.query.isbn?.trim();
        
        // Build query based on search parameters
        let query = {};
        let filtroData = {};
        
        if (titulo) {
            // Normalize title for search
            const normalizedTitle = normalize(titulo);
            query['TITULO_DO_LIVRO'] = { $regex: new RegExp(normalizedTitle, 'i') };
        }

        if (isbn) {
            // Normalize ISBN for search
            const normalizedIsbn = normalize(isbn);
            query['ISBN'] = { $regex: new RegExp(normalizedIsbn, 'i') };
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

        const totalDocs = await Livro.countDocuments(query);
        
        // Get all duplicates from the duplicates collection matching the query
        const duplicatesCollection = mongoose.connection.db.collection('livros_duplicados');
        const livrosDuplicados = await duplicatesCollection.find(query).toArray();
        
        // Get paginated documents
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Apply pagination to unique documents
        //const paginatedLivros = livrosUnicos.slice(skip, skip + limit);
        
        // Get all unique documents from Livro collection matching the query
        const livrosUnicos = await Livro.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ ANO: -1 }) // Sort by year in descending order
           
        if (!livrosUnicos || livrosUnicos.length === 0) {
            return res.status(404).json({ 
                error: 'Nenhum documento encontrado',
                total: livrosUnicos.length,
                duplicatesCount: livrosDuplicados.length,
                duplicates: livrosDuplicados
            });
        }

        const totalPages = Math.ceil(totalDocs / limit);

        res.status(200).json({
            total: totalDocs,
            duplicatesCount: livrosDuplicados.length,
            duplicates: livrosDuplicados,
            data: livrosUnicos,
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
            error: 'Erro ao buscar livros', 
            details: err.message 
        });
    }
};

// Helper function to normalize text
const normalize = (text) => {
    if (!text) return '';
    return text
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/[\W_]/g, '') // Remove special characters and underscores
        .trim();
};

module.exports = {
    createTodosLivros,
    deleteAllLivros,
    getAllLivros
};