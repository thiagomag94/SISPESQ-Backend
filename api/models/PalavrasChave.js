const mongoose = require('mongoose');
const { Schema } = mongoose;

const PalavrasChaveSchema = new Schema({
    ID_Lattes: {
        type: String,
        required: true,
        index: true,
        ref: 'Researcher', // Referência ao ID_Lattes do banco Researcher
        validate: {
            validator: async function(value) {
                const Researcher = mongoose.model('Researcher');
                return await Researcher.findOne({ ID_Lattes: value });
            },
            message: 'ID Lattes não encontrado no banco Researcher'
        }
    },

    PALAVRA_CHAVE_1: String,
    PALAVRA_CHAVE_2: String,
    PALAVRA_CHAVE_3: String,
    PALAVRA_CHAVE_4: String,
    PALAVRA_CHAVE_5: String,
    PALAVRA_CHAVE_6: String
});

const PalavrasChave = mongoose.model('PalavrasChave', PalavrasChaveSchema);
module.exports = PalavrasChave;
