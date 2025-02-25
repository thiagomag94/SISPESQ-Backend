const mongoose = require('mongoose')
const {Schema} = mongoose
const bcrypt = require('bcryptjs');
const { type } = require('os');

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
    KEYWORDS: {type:Array, default:[]}
    }
    
)

const DepartamentoSchema = new Schema({
    aleatorio:String,
    id:{type:Number, unique:true},
    NOME: {type:String, unique:true, required:true},
    SIGLA_CENTRO: {type:String, unique:true, required:true},
    NUM_DOCENTES: String,
    NUM_DOCENTES_LATTES: String,
    NUM_DOCENTES_ORCID: String,
    NUM_DOCENTES_SCOPUS: String,
    NUM_DOCENTES_SCHOLAR: String,
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

DataPesqSchema.post('save', async function(doc) {
    try {
        // Encontra o departamento ao qual o docente pertence
        const departamento = await Departamento.findById(doc.DEPARTAMENTO_ID);
        if (!departamento) {
            console.error('Departamento não encontrado');
            return;
        }

        // Recalcular a produção total por ano (2024 a 2020)
        for (let ano = 2020; ano <= 2024; ano++) {
            const producaoAno = doc.PRODUCAO[ano];
            if (producaoAno) {
                departamento.PRODUCAO_TOTAL[ano].BIBLIOGRAFICA += producaoAno.BIBLIOGRAFICA;
                departamento.PRODUCAO_TOTAL[ano].TECNICA += producaoAno.TECNICA;
                departamento.PRODUCAO_TOTAL[ano].ARTISTICA += producaoAno.ARTISTICA;
            }
        }

        // Recalcular o número de docentes para o departamento
        const numDocentes = await Docente.countDocuments({ DEPARTAMENTO_ID: doc.DEPARTAMENTO_ID });
        departamento.NUM_DOCENTES = numDocentes;

        // Salvar as alterações no departamento
        await departamento.save();
    } catch (error) {
        console.error('Erro ao atualizar a produção do departamento:', error);
    }
});

// Quando um docente for removido ou sua produção alterada, também será necessário recalcular a produção
DataPesqSchema.post('remove', async function(doc) {
    try {
        // Encontra o departamento do docente removido
        const departamento = await Departamento.findById(doc.DEPARTAMENTO_ID);
        if (!departamento) {
            console.error('Departamento não encontrado');
            return;
        }

        // Subtrair a produção do docente removido de cada ano
        for (let ano = 2020; ano <= 2024; ano++) {
            const producaoAno = doc.PRODUCAO[ano];
            if (producaoAno) {
                departamento.PRODUCAO_TOTAL[ano].BIBLIOGRAFICA -= producaoAno.BIBLIOGRAFICA;
                departamento.PRODUCAO_TOTAL[ano].TECNICA -= producaoAno.TECNICA;
                departamento.PRODUCAO_TOTAL[ano].ARTISTICA -= producaoAno.ARTISTICA;
            }
        }

        // Recalcular o número de docentes para o departamento
        const numDocentes = await Docente.countDocuments({ DEPARTAMENTO_ID: doc.DEPARTAMENTO_ID });
        departamento.NUM_DOCENTES = numDocentes;

        // Salvar as alterações no departamento
        await departamento.save();
    } catch (error) {
        console.error('Erro ao atualizar a produção do departamento após remoção:', error);
    }
});

const professoresdb = mongoose.model('Professores', professoresSchema)
const usersdb = mongoose.model('Users', userSchema)
const Datapesqdb = mongoose.model('DataPesq', DataPesqSchema)
const Departamento = mongoose.model('Departamento', DepartamentoSchema);

module.exports = {professoresdb, usersdb, Datapesqdb, Departamento}