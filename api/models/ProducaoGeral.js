const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProducaoGeralSchema = new Schema({
    _id: String,
    id_lattes: String,
    nome: String,
    departamento: String,
    centro: String,
    situacao_funcional: String,
    periodo_atividade: {
        inicio: Date,
        fim: Date
    },
    contagem: {
        artigos: Number,
        livros: Number,
        capitulos: Number,
        trabalhos_eventos: Number,
        textos_jornais: Number,
        softwares: Number,
        patentes: Number,
        orientacoes_concluidas: {
            doutorado: Number,
            mestrado: Number,
            pos_doutorado: Number
        },
        orientacoes_andamento: {
            doutorado: Number,
            mestrado: Number,
            pos_doutorado: Number
        }
    },
    producoes: {
        artigos: Array,
        livros: Array,
        capitulos: Array,
        trabalhos_eventos: Array,
        textos_jornais: Array,
        softwares: Array,
        patentes: Array,
        orientacoes_concluidas: {
            doutorado: Array,
            mestrado: Array,
            pos_doutorado: Array
        },
        orientacoes_andamento: {
            doutorado: Array,
            mestrado: Array,
            pos_doutorado: Array
        }
    }
});

module.exports = {ProducaoGeralSchema}