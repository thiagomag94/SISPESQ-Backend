const mongoose = require('mongoose');
const { Schema } = mongoose;
const {AutorSchema} = require('./Autor');
const { PalavrasChaveSchema } = require('./PalavrasChave');

const PartiturasSchema = new Schema({
        NATUREZA: String,
        TITULO: String,
        ANO: Date,
        PAIS_DE_PUBLICACAO: String,
        IDIOMA: String,
        MEIO_DE_DIVULGACAO: String,
        HOME_PAGE_DO_TRABALHO: String,
        DOI: String,
        TITULO_INGLES: String,
        EDITORA: String,
        CIDADE_EDITORA: String,
        NUMERO_DE_PAGINAS: String,
        NUMERO_DO_CATALOGO: String,
        AUTORES: [AutorSchema],
        PALAVRAS_CHAVE:[String],
})

const Partituras = mongoose.model('Partituras', PartiturasSchema);
module.exports = Partituras;