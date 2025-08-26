const mongoose = require('mongoose');
const { Schema } = mongoose;


const RelacaoIssnSchema = new Schema({
    ISSN: { type: String, index: true }, // Este é o ISSN físico
    EISSN: { type: String, index: true } // Este é o online, removemos o 'unique'
});


const Issndb = mongoose.model('RelacaoIssn', RelacaoIssnSchema);
module.exports = Issndb;