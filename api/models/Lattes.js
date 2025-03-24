const mongoose = require('mongoose')
const {Schema} = mongoose


const LattesSchema = new Schema({
    CURRICULO_VITAE: {
        ID_Lattes: {type:String, unique:true, required:true},
        DATA_ATUALIZACAO: String,
        
        DADOS_GERAIS: {
            NOME_COMPLETO: String,
            NOME_EM_CITACOES_BIBLIOGRAFICAS: String,
            NACIONALIDADE: String,
            PAIS_DE_NASCIMENTO: String,
            UF_NASCIMENTO: String,
            CIDADE_NASCIMENTO: String,
            DATA_FALECIMENTO: String,
            TEXTO_RESUMO_CV_RH_EN: String,
            ORCID_ID: String,
        },
        FORMACAO_ACADEMICA_TITULACAO: {
            GRADUACAO: [{
                NOME_CURSO: String,
                NOME_INSTITUICAO: String,
                ANO_DE_INICIO: String,
                ANO_DE_CONCLUSAO: String,
            }],
            MESTRADO: {
                CURSO: String,
                NOME_INSTITUICAO: String,
                ANO_DE_CONCLUSAO: String,
                ANO_DE_INICIO: String,
                ANO_DE_OBTENCAO_DO_TITULO: String,
                PALAVRAS_CHAVE:{
                    PALAVRA_CHAVE_1: String,
                    PALAVRA_CHAVE_2: String,
                    PALAVRA_CHAVE_3: String,
                    PALAVRA_CHAVE_4: String,
                    PALAVRA_CHAVE_5: String,
                    PALAVRA_CHAVE_6: String,
                },
            },
            DOUTORADO: {
                CURSO: String,
                TITULO_DA_DISSERTACAO_TESE: String,
                NOME_INSTITUICAO: String,
                ANO_DE_CONCLUSAO: String,
                ANO_DE_INICIO: String,
                ANO_DE_OBTENCAO_DO_TITULO: String,
                PALAVRAS_CHAVE:{
                    PALAVRA_CHAVE_1: String,
                    PALAVRA_CHAVE_2: String,
                    PALAVRA_CHAVE_3: String,
                    PALAVRA_CHAVE_4: String,
                    PALAVRA_CHAVE_5: String,
                    PALAVRA_CHAVE_6: String,
                },
            },
            POS_DOUTORADO: {
                NOME_INSTITUICAO: String,
                ANO_DE_CONCLUSAO: String,
                ANO_DE_INICIO: String,
                ANO_DE_OBTENCAO_DO_TITULO: String,
            },
        },
        PRODUCAO_BIBLIOGRAFICA: {
            ARTIGOS_PUBLICADOS: [
                {
                    TITULO_DO_ARTIGO: String,
                    TITULO_DO_ARTIGO_INGLES: String,
                    ANO_DO_ARTIGO: String,
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
                    PALAVRAS_CHAVE:{
                        PALAVRA_CHAVE_1: String,
                        PALAVRA_CHAVE_2: String,
                        PALAVRA_CHAVE_3: String,
                        PALAVRA_CHAVE_4: String,
                        PALAVRA_CHAVE_5: String,
                        PALAVRA_CHAVE_6: String,
                    },
                    HOME_PAGE_DO_TRABALHO: String,
                 
                },
            ],
            LIVROS_E_CAPITULOS: [
                {
                    TITULO_DO_LIVRO: String,
                    ANO_DO_LIVRO: String,
                    AUTORES: String,
                    ISBN: String,
                    NOME_DA_EDITORA: String,
                    NUMERO_DE_PAGINAS: String,
                    DOI: String,
                },
            ],
        },
        PRODUCAO_TECNICA: {
            SOFTWARE: [
                {
                    TITULO_DO_SOFTWARE_INGLES: String,
                    ANO: String,
                    AUTORES: [
                        {
                            NOME_COMPLETO_DO_AUTOR: String,
                            ORDEM_DE_AUTORIA: String,
                            ID_Lattes: String,
                        },
                    ],
                    TIPO: String,
                    FINALIDADE: String,
                    AMBIENTE: String,
                    HOME_PAGE: String,
                   
                },
            ],
            PATENTE: [
                {
                    TITULO_INGLES: String,
                    ANO_DESENVOLVIMENTO: String,
                    AUTORES: [
                        {
                            NOME_COMPLETO_DO_AUTOR: String,
                            ORDEM_DE_AUTORIA: String,
                            ID_Lattes: String,
                        },
                    ],
                    TIPO_PATENTE: String,
                    CODIGO_DO_REGISTRO_OU_PATENTE: String,
                    INSTITUICAO_DEPOSITO_REGISTRO: String,
                    HOME_PAGE: String,
                },
            ],
        },
        ORIENTACOES_CONCLUIDAS: {
            ORIENTACOES_CONCLUIDAS_PARA_DOUTORADO: [
                {
                    NOME_DO_ORIENTADO: String,
                    ANO: String,
                    TITULO: String,
                    NOME_DA_INSTITUICAO: String,
                    NOME_DO_CURSO: String,
                    TIPO: String,
                    TIPO_DE_ORIENTACAO: String,
                },
            ],
            ORIENTACOES_CONCLUIDAS_PARA_MESTRADO: [
                {
                    NOME_DO_ORIENTADO: String,
                    ANO: String,
                    TITULO: String,
                    NOME_DA_INSTITUICAO: String,
                    NOME_DO_CURSO: String,
                    TIPO: String,
                    TIPO_DE_ORIENTACAO: String,
                },
            ],
            ORIENTACOES_CONCLUIDAS_PARA_POS_DOUTORADO: [
                {
                    NOME_DO_ORIENTADO: String,
                    ANO: String,
                    TITULO: String,
                    NOME_DA_INSTITUICAO: String,
                    NOME_DO_CURSO: String,
                   
                },
            ],
            
        },
    },
});

const lattesdb = mongoose.model('Lattes', LattesSchema);
module.exports = {lattesdb}