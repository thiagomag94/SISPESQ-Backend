const mongoose = require('mongoose')
const {Schema} = mongoose
const bcrypt = require('bcryptjs');
const { type } = require('os');
const {datapesqdb} = require('./db');


   


const artigoSchema = new Schema({
  nm_pess: {
    type: String,
    required: true, // Nome do professor ou docente
  },
  docente_ufpe: {
    type: Boolean,
    required: true, // Indica se o docente é da UFPE (true/false)
  },
  txt_titulo_producao: {
    type: String,
    required: true, // Título da produção
  },
  contagem_ufpe: {
    type: Number,
    required: true, // Contagem de artigos relacionados à UFPE
  },
  contagem: {
    type: Number,
    required: true, // Contagem geral de artigos
  },
  checagem: {
    type: Boolean,
    required: true, // Indicador de checagem (true/false)
  },
  fracao_docente: {
    type: Number,
    required: true, // Fração do docente na produção
  },
  txt_titulo_periodico_public: {
    type: String,
    required: true, // Título do periódico ou publicação
  },
  nro_volume: {
    type: String, // Número do volume
    required: true,
  },
  nro_pagina_inicial: {
    type: Number, // Página inicial do artigo
    required: true,
  },
  nro_pagina_final: {
    type: Number, // Página final do artigo
    required: true,
  },
  txt_issn_isbn: {
    type: String, // ISSN ou ISBN do periódico
    required: true,
  },
  issn_isbn: {
    type: String, // ISSN ou ISBN
    required: true,
  },
  issn_teste: {
    type: String, // Teste de ISSN (caso tenha)
    required: true,
  },
  ano_artigo: {
    type: Number, // Ano do artigo
    required: true,
  },
  qualis_spaiva: {
    type: String, // Qualis segundo a classificação de Spaiva
    required: true,
  },
  qualis_consolidado: {
    type: String, // Qualis consolidado do artigo
    required: true,
  },
  consistencia: {
    type: String, // Consistência dos dados
    required: true,
  },
  qualis_hibrido: {
    type: String, // Qualis híbrido do artigo
    required: true,
  }
});

const Artigodb = mongoose.model('Artigo', artigoSchema);

module.exports = Artigodb;


