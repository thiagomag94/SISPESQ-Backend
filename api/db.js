const mongoose = require('mongoose')
const {Schema} = mongoose
const bcrypt = require('bcryptjs');
const { type } = require('os');



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
    RANKING: String,
    SCHOLAR: String,
    SCOPUS: String,
    ORCID: String,
    LATTES: String,
    PRODUCAO: {
        2024: {
            BIBLIOGRAFICA: { type: Number, default: 0 },
            TECNICA: { type: Number, default: 0 },
            ARTISTICA: { type: Number, default: 0 }
        },
        2023: {
            BIBLIOGRAFICA: { type: Number, default: 0 },
            TECNICA: { type: Number, default: 0 },
            ARTISTICA: { type: Number, default: 0 }
        },
        2022: {
            BIBLIOGRAFICA: { type: Number, default: 0 },
            TECNICA: { type: Number, default: 0 },
            ARTISTICA: { type: Number, default: 0 }
        },
        2021: {
            BIBLIOGRAFICA: { type: Number, default: 0 },
            TECNICA: { type: Number, default: 0 },
            ARTISTICA: { type: Number, default: 0 }
        },
        2020: {
            BIBLIOGRAFICA: { type: Number, default: 0 },
            TECNICA: { type: Number, default: 0 },
            ARTISTICA: { type: Number, default: 0 }
        }
    },
    KEYWORDS: {type:Array, default:[]},
    ARTIGOS: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artigos' }] // Referência para os artigos publicados pelo pesquisador
    }
    
)

const DepartamentoSchema = new Schema({
    NOME_DEPARTAMENTO: {type:String, unique:true ,required:true},
    SIGLA_CENTRO: {type:String, required:true},
    NUM_DOCENTES: String,
    NUM_DOCENTES_LATTES: String,
    NUM_DOCENTES_ORCID: String,
    NUM_DOCENTES_SCOPUS: String,
    NUM_DOCENTES_SCHOLAR: String,
    ID_DOCENTES: [{type:mongoose.Schema.Types.ObjectId, ref:'DataPesq'}],
    PRODUCAO: {
        2024: {
            BIBLIOGRAFICA: { type: Number, default: 0 },
            TECNICA: { type: Number, default: 0 },
            ARTISTICA: { type: Number, default: 0 }
        },
        2023: {
            BIBLIOGRAFICA: { type: Number, default: 0 },
            TECNICA: { type: Number, default: 0 },
            ARTISTICA: { type: Number, default: 0 }
        },
        2022: {
            BIBLIOGRAFICA: { type: Number, default: 0 },
            TECNICA: { type: Number, default: 0 },
            ARTISTICA: { type: Number, default: 0 }
        },
        2021: {
            BIBLIOGRAFICA: { type: Number, default: 0 },
            TECNICA: { type: Number, default: 0 },
            ARTISTICA: { type: Number, default: 0 }
        },
        2020: {
            BIBLIOGRAFICA: { type: Number, default: 0 },
            TECNICA: { type: Number, default: 0 },
            ARTISTICA: { type: Number, default: 0 }
        }
    }
    }
    
)






const usersdb = mongoose.model('Users', userSchema)
const Datapesqdb = mongoose.model('DataPesq', DataPesqSchema)


const Departamentodb = mongoose.model('Departamento', DepartamentoSchema);

module.exports = {usersdb, Datapesqdb, Departamentodb}