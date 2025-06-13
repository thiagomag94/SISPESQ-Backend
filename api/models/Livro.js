const mongoose = require('mongoose');
const { Schema } = mongoose;
const {AutorSchema} = require('./Autor');
const {PalavrasChaveSchema} = require('./PalavrasChave');

const LivroSchema = new Schema({
    ID_LATTES_AUTOR: String,
    NATUREZA: String,
    TITULO_DO_LIVRO: String,
    TITULO_DO_LIVRO_INGLES: String,
    PAIS_DE_PUBLICACAO: String,
    IDIOMA: String,
    MEIO_DE_DIVULGACAO: String,
    ANO: Date,
    NOME_DA_EDITORA: String,
    NUMERO_DE_PAGINAS: String,
    DOI: String,
    TIPO: String,
    HOME_PAGE_DO_TRABALHO: String,
    NUMERO_DE_VOLUMES: String,
    ISBN: String,
    AUTORES: [AutorSchema],
    PALAVRAS_CHAVE: PalavrasChaveSchema
});

const Livro = mongoose.model('Livro', LivroSchema);
module.exports = Livro;
