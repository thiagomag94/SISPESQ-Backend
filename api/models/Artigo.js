const mongoose = require('mongoose');
const { Schema } = mongoose;
const {AutorSchema} = require('./Autor');

const ArtigoSchema = new Schema({
    ID_LATTES_AUTOR: String,
    DEPARTAMENTO: String,
    CENTRO: String,
    TITULO_DO_ARTIGO: String,
    TITULO_DO_ARTIGO_INGLES: String,
    ANO_DO_ARTIGO: Date,
    AUTORES: [AutorSchema],
    TITULO_DO_PERIODICO_OU_REVISTA: String,
    VOLUME: String,
    PAGINA_INICIAL: String,
    PAGINA_FINAL: String,
    DOI: String,
    ISSN: String,
    IDIOMA: String,
    PALAVRAS_CHAVE: [String],
    HOME_PAGE_DO_TRABALHO: String
});

ArtigoSchema.index(
    { PALAVRAS_CHAVE: 'text' }, 
    { default_language: 'portuguese' }
);
const Artigo = mongoose.model('Artigo', ArtigoSchema);
module.exports = Artigo;
