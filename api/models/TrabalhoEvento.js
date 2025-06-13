const mongoose = require('mongoose');
const { Schema } = mongoose;
const {AutorSchema} = require('./Autor');
const {PalavrasChaveSchema} = require('./PalavrasChave');

const TrabalhoEventoSchema = new Schema({
    ID_LATTES_AUTOR: String, // Campo para relacionar ao autor
    NATUREZA: String,
    TITULO_DO_TRABALHO: String,
    ANO_DO_TRABALHO: Date,
    PAIS_DO_EVENTO: String,
    IDIOMA: String,
    MEIO_DE_DIVULGACAO: String,
    HOME_PAGE_DO_TRABALHO: String,
    DOI: String,
    TITULO_DO_TRABALHO_INGLES: String,
    CLASSIFICACAO_DO_EVENTO: String,
    NOME_DO_EVENTO: String,
    CIDADE_DO_EVENTO: String,
    ANO_DE_REALIZACAO: String,
    AUTORES: [AutorSchema],
    PALAVRAS_CHAVE: PalavrasChaveSchema
});

const TrabalhoEvento = mongoose.model('TrabalhoEvento', TrabalhoEventoSchema);
module.exports = TrabalhoEvento;
