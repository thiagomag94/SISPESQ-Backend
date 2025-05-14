const mongoose = require('mongoose');
const { Schema } = mongoose;

const ArtigoPublicadoSchema = new Schema({
  ID_Lattes: { type: String, required: true, index: true }, // ID do currículo do autor principal
  TITULO_DO_ARTIGO: String,
  TITULO_DO_ARTIGO_INGLES: String,
  ANO_DO_ARTIGO: { type: Date },
  AUTORES: [
    {
      NOME_COMPLETO_DO_AUTOR: String,
      ORDEM_DE_AUTORIA: String,
      ID_Lattes: String,
    },
  ],
  TITULO_DO_PERIODICO_OU_REVISTA: String,
  VOLUME: String,
  PAGINA_INICIAL: String,
  PAGINA_FINAL: String,
  DOI: String,
  ISSN: String,
  IDIOMA: String,
  PALAVRAS_CHAVE: {
    PALAVRA_CHAVE_1: String,
    PALAVRA_CHAVE_2: String,
    PALAVRA_CHAVE_3: String,
    PALAVRA_CHAVE_4: String,
    PALAVRA_CHAVE_5: String,
    PALAVRA_CHAVE_6: String,
  },
  HOME_PAGE_DO_TRABALHO: String,
});

module.exports = mongoose.model('ArtigoPublicado', ArtigoPublicadoSchema); 