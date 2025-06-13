const mongoose = require('mongoose');
const { Schema } = mongoose;

const PalavrasChaveSchema = new Schema({

    PALAVRA_CHAVE_1: String,
    PALAVRA_CHAVE_2: String,
    PALAVRA_CHAVE_3: String,
    PALAVRA_CHAVE_4: String,
    PALAVRA_CHAVE_5: String,
    PALAVRA_CHAVE_6: String
});

const PalavrasChave = mongoose.model('PalavrasChave', PalavrasChaveSchema);
module.exports = {PalavrasChave, PalavrasChaveSchema};
