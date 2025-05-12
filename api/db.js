const mongoose = require('mongoose')
const {Schema} = mongoose
const bcrypt = require('bcryptjs');


// Esquema para Permissões
const PermissionSetSchema = new mongoose.Schema({
  administrador_sistema: { type: Boolean, default: false },
  gestor_institucional: { type: Boolean, default: false },
  gestor_unidade: { type: Boolean, default: false },
  gestor_departamento: { type: Boolean, default: false },
  coordenador_pesquisa: { type: Boolean, default: false },
  producao_consultar: { type: Boolean, default: false },
  producao_validar: { type: Boolean, default: false },
  producao_editar: { type: Boolean, default: false },
  producao_ocultar: { type: Boolean, default: false },
  producao_importar: { type: Boolean, default: false },
  grupos_gerenciar: { type: Boolean, default: false },
  grupos_membros: { type: Boolean, default: false },
  grupos_relatorios: { type: Boolean, default: false },
  projetos_consultar: { type: Boolean, default: false },
  projetos_cadastrar: { type: Boolean, default: false },
  projetos_avaliar: { type: Boolean, default: false },
  projetos_financiamento: { type: Boolean, default: false },
  indicadores_visualizar: { type: Boolean, default: false },
  indicadores_exportar: { type: Boolean, default: false },
  indicadores_customizar: { type: Boolean, default: false },
  usuarios_gerenciar: { type: Boolean, default: false },
  parametrizacoes: { type: Boolean, default: false },
  auditoria: { type: Boolean, default: false }
}, { _id: false });

// Esquema Principal do Usuário
const UserSchema = new mongoose.Schema({
  // Dados básicos do formulário
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    maxlength: [120, 'Nome não pode exceder 120 caracteres']
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@ufpe\.br$/, 'Por favor, use um email institucional @ufpe.br']
  },
  password: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    
    minlength: [8, 'Senha deve ter no mínimo 8 caracteres']
  },
  ID_Lattes: {
    type: String,
    required: false,
    unique: false,
    trim: true,
    match: [/^\d+$/, 'ID Lattes deve conter apenas números']
  },

  // Controle de acesso
  isAdmin: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    required: true,
    enum: {
      values: ['Administrador do Sistema', 'Gestor da Propesqi', 'Gestor de Departamento', 'Pesquisador'],
      message: 'Tipo de usuário inválido'
    },
    default: 'Pesquisador'
  },
  permissions: {
    type: PermissionSetSchema,
    required: true,
    default: () => ({})
  },

  // Dados adicionais básicos
  lastPasswordChange: {
    type: Date,
    default: Date.now
  },
  lastActivity: {type:Date}
}, { timestamps: true });



// Índices para otimização
UserSchema.index({ email: 1 }, { unique: true });

UserSchema.index({ role: 1 });





  // Antes de salvar, criptografar a senha com hash bcrypt
UserSchema.pre('save', async function (next) {
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
const ResearcherSchema = new Schema({
    aleatorio:String,
    PESQUISADOR: {type:String},
    ID_Lattes: {type:String},
    SEXO: String,
    REGIME_DE_TRABALHO: String,
    DATA_NASCIMENTO: String,
    SIAPE: String,
    SIGLA_CENTRO: String,
    UORG_LOTACAO: String,
    DATA_INGRESSO_UFPE: {
      type: Date,
      set: (v) => v ? new Date(v.split('/').reverse().join('-')) : null, // Converte "DD/MM/YYYY" → Date
  },
  DATA_EXCLUSAO_UFPE: {
      type: Date,
      set: (v) => v ? new Date(v.split('/').reverse().join('-')) : null, // Trata campos vazios
  },
    TITULACAO: String,
    CARGO: String,
    C: String,
    NV: String,
    SITUACAO_FUNCIONAL: String,
})




const DepartamentoSchema = new Schema({
    NOME_DEPARTAMENTO: {type:String, unique:true ,required:true},
    SIGLA_CENTRO: {type:String, required:true},
    NUM_DOCENTES: String,
    NUM_DOCENTES_LATTES: String,
    NUM_DOCENTES_ORCID: String,
    NUM_DOCENTES_SCOPUS: String,
    NUM_DOCENTES_SCHOLAR: String,
    ID_DOCENTES: [{type:mongoose.Schema.Types.ObjectId, ref:'Researcher'}],
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






const usersdb = mongoose.model('Users', UserSchema)
const Datapesqdb = mongoose.model('DataPesq', DataPesqSchema)

const Researcherdb = mongoose.model('Researcher', ResearcherSchema)
const Departamentodb = mongoose.model('Departamento', DepartamentoSchema);

module.exports = {usersdb, Datapesqdb, Departamentodb, Researcherdb}