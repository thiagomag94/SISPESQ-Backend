const mongoose = require('mongoose');
const { Schema } = mongoose;
const Autor = require('./Autor');

const SoftwareSchema = new Schema({
    TITULO_DO_SOFTWARE: String,
    TITULO_DO_SOFTWARE_INGLES: String,
    ANO: Date,
    AUTORES: [Autor.schema],
    TIPO: String,
    FINALIDADE: String,
    AMBIENTE: String,
    HOME_PAGE: String
});

const Software = mongoose.model('Software', SoftwareSchema);
module.exports = Software;
