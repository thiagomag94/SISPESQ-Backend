const mongoose = require('mongoose')
const {Schema} = mongoose
const bcrypt = require('bcryptjs');

const professoresSchema = new Schema({
    NOME:String,
    EMAIL_PRINCIPAL:String,
    EMAIL_SECUNDARIO:String,
    DEPARTAMENTO:String,
    CENTRO:String,
    LINHA_DE_PESQUISA:String
})

const userSchema = new mongoose.Schema({
    name: { 
        type:String, 
        unique: true, 
        required:true
    },
    email: { 
        type:String, 
        unique: true,
        required:true
    },
    password: {
        type:String,
        required:true
    },
    isAdmin: {
        type:Boolean,
        default: false
      }
  });

  // Antes de salvar, criptografar a senha com hash bcrypt
userSchema.pre('save', async function (next) {
    const user = this;
    if (user.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(user.password, salt);
      user.password = hash;
    }
    next();
  });

  const DataPesqSchema = new Schema({
    aleatorio:String,
    id:{type:Number, unique:true},
    PESQUISADOR: {type:String, unique:true},
    NUM_SIAPE: String,
    DOCENTE_UFPE_2014: String,
    CH_EXTENSIONISTA: String,
    EXTENSIONISTA: String,
    GESTOR: String,
    FUNCAO_GRATIFICADA: String,
    SEXO: String,
    DATA_NASCIMENTO: String,
    IDADE: String,
    FAIXA_ETARIA: String,
    DATA_ADMISSAO: String,
    T_ADMISSAO_HOJE: String,
    FAIXA_T_ADMISSAO: String,
    CAMPUS: String,
    SIGLA_CENTRO: String,
    UORG_LOTACAO: String,
    CARGO: String,
    REGIME_DE_TRABALHO: String,
    ESCOLARIDADE: String,
    TITULACAO: String,
    ATUACAO_PPGs_UFPE_PERMANENTE: String,
    ATUACAO_PPGs_UFPE_COLABORADOR: String,
    ATUACAO_PPGs_UFPE_TOTAL: String,
    ORIENTACOES_MESTRADO: String,
    ORIENTACOES_DOUTORADO: String,
    TOTAL: String,
    A1: String,
    A2: String,
    A3: String,
    A4: String,
    B1: String,
    B2: String,
    B3: String,
    B4: String,
    C: String,
    NP: String,
    TOTAL_GLOBAL: String,
    TOTAL_QUALIFICADO_MAIORIGUALC: String,
    TOTAL_MAIORIGUALB4: String,
    TOTAL_MAIORIGUALA4: String,
    TOTAL_MAIORIGUALA2: String,
    PONTUACAO: String,
    PERCENTIL: String,
    RANKING: String
    }
    
)




const professoresdb = mongoose.model('Professores', professoresSchema)
const usersdb = mongoose.model('Users', userSchema)
const Datapesqdb = mongoose.model('DataPesq', DataPesqSchema)

module.exports = {professoresdb, usersdb, Datapesqdb}