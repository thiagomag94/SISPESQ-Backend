const mongoose = require('mongoose');
const { Schema } = mongoose;


const PeriodicoSchema = new Schema({
        ISSN: { type: String, index: true, unique: true },
        TITULO: { type: String, index: 'text' },
        QUALIS: { type: String, index: true }
})


const Periodicosdb = mongoose.model('Periodicos', PeriodicoSchema);
module.exports = Periodicosdb;