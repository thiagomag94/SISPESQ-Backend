const mongoose = require('mongoose');
const { Schema } = mongoose;
const { AutorSchema } = require('./Autor');

const ArtigoSchema = new Schema({
    ID_LATTES_AUTOR: { type: String, index: true },
    DEPARTAMENTO: { type: String, index: true },
    CENTRO: { type: String, index: true },
    TITULO_DO_ARTIGO: { type: String, index: true },
    TITULO_DO_ARTIGO_INGLES: { type: String, index: true },
    ANO_DO_ARTIGO: { type: Date, index: true },
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

// Índice para o ISSN (para as buscas de qualis)
ArtigoSchema.index({ ISSN: 1 });

// Índice de texto para as palavras-chave, com a opção de idioma
ArtigoSchema.index(
    { PALAVRAS_CHAVE: 'text' },
    { default_language: 'portuguese' }
);

const Artigo = mongoose.model('Artigo', ArtigoSchema);
module.exports = Artigo;