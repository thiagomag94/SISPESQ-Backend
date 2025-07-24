const mongoose = require('mongoose');
const { Schema } = mongoose;
const {AutorSchema} = require('./Autor');
const { PalavrasChaveSchema } = require('./PalavrasChave');

const OutrasProducoesBibliograficas = new Schema({
        NATUREZA: String,
        TITULO: String,
        ANO: Date,
        IDIOMA: String,
        MEIO_DE_DIVULGACAO: String,
        HOME_PAGE_DO_TRABALHO: String,
        DOI: String,
        PAIS_DE_PUBLICACAO: String,
        TITULO_INGLES: String,
        EDITORA: String,
        CIDADE_EDITORA: String,
        NUMERO_DE_PAGINAS: String,
        ISSN_ISBN: String,
        AUTORES: [AutorSchema],
        PALAVRAS_CHAVE:PalavrasChaveSchema,
    })