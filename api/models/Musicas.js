const mongoose = require('mongoose');
const { Schema } = mongoose;
const {AutorSchema} = require('./Autor');
const { PalavrasChaveSchema } = require('./PalavrasChave');

const MusicasSchema = new Schema({
        NATUREZA: String,
        TITULO: String,
        TITULO_INGLES: String,
        ANO: Date,
        PAIS: String,
        IDIOMA: String,
        MEIO_DE_DIVULGACAO: String,
        HOME_PAGE: String,
        TIPO_DE_EVENTO: String,
        DATA_ESTREIA: String,
        DATA_ENCERRAMENTO: String,
        LOCAL_DE_ESTREIA: String,
        DURACAO: String,
        INSTITUICAO_PROMOTORA_DO_EVENTO: String,
        CIDADE_DO_EVENTO: String,
        LOCAL_DO_EVENTO: String,
        AUTORES: [AutorSchema],
        PALAVRAS_CHAVE:PalavrasChaveSchema,
})

const Musicas = mongoose.model('Musicas', MusicasSchema);
module.exports = Musicas;