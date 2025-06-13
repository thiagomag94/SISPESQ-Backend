const mongoose = require('mongoose');
const { Schema } = mongoose;
const {AutorSchema} = require('./Autor');
const {PalavrasChaveSchema} = require('./PalavrasChave');

const ArtigoSchema = new Schema({
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
    PALAVRAS_CHAVE: PalavrasChaveSchema,
    HOME_PAGE_DO_TRABALHO: String
});

const Artigo = mongoose.model('Artigo', ArtigoSchema);
module.exports = Artigo;
