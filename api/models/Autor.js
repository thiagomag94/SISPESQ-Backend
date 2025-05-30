const mongoose = require('mongoose');
const { Schema } = mongoose;

const AutorSchema = new Schema({
    NOME_COMPLETO_DO_AUTOR: String,
    ORDEM_DE_AUTORIA: String,
    ID_Lattes: String
});

const Autor = mongoose.model('Autor', AutorSchema);
module.exports = Autor;
