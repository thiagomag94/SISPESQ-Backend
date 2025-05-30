const mongoose = require('mongoose');
const { Schema } = mongoose;
const Autor = require('./Autor');
const PalavrasChave = require('./PalavrasChave');

const CapituloSchema = new Schema({
    TIPO: String,
    TITULO_DO_CAPITULO_DO_LIVRO: String,
    ANO: Date,
    PAIS_DE_PUBLICACAO: String,
    IDIOMA: String,
    MEIO_DE_DIVULGACAO: String,
    HOME_PAGE_DO_TRABALHO: String,
    DOI: String,
    TITULO_DO_CAPITULO_DO_LIVRO_INGLES: String,
    TITULO_DO_LIVRO: String,
    NUMERO_DE_VOLUMES: String,
    NUMERO_DE_PAGINAS: String,
    ISBN: String,
    AUTORES: [Autor.schema],
    PALAVRAS_CHAVE: PalavrasChave.schema
});

const Capitulo = mongoose.model('Capitulo', CapituloSchema);
module.exports = Capitulo;
