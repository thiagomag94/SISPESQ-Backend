const mongoose = require('mongoose');
const { Schema } = mongoose;
const Autor = require('./Autor');

const PatenteSchema = new Schema({
    TITULO: String,
    TITULO_INGLES: String,
    ANO_DESENVOLVIMENTO: String,
    AUTORES: [Autor.schema],
    PAIS: String,
    CODIGO_DO_REGISTRO_OU_PATENTE: String,
    INSTITUICAO_DEPOSITO_REGISTRO: String,
    HOME_PAGE: String,
    DATA_DE_CONCESSAO: Date,
    DATA_DE_DEPOSITO: Date
});

const Patente = mongoose.model('Patente', PatenteSchema);
module.exports = Patente;
