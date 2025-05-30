const mongoose = require('mongoose');
const { Schema } = mongoose;
const Autor = require('./Autor');
const PalavrasChave = require('./PalavrasChave');

const TextoJornalSchema = new Schema({
    NATUREZA: String,
    TITULO_DO_TEXTO: String,
    ANO_DO_TEXTO: Date,
    PAIS_DE_PUBLICACAO: String,
    IDIOMA: String,
    MEIO_DE_DIVULGACAO: String,
    HOME_PAGE_DO_TRABALHO: String,
    DOI: String,
    TITULO_DO_TRABALHO_INGLES: String,
    TITULO_DO_JORNAL_OU_REVISTA: String,
    ISSN: String,
    DATA_DE_PUBLICACAO: String,
    PAGINA_INICIAL: String,
    PAGINA_FINAL: String,
    LOCAL_DE_PUBLICACAO: String,
    AUTORES: [Autor.schema],
    PALAVRAS_CHAVE: PalavrasChave.schema
});

const TextoJornal = mongoose.model('TextoJornal', TextoJornalSchema);
module.exports = TextoJornal;
