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
            TEXTO_RESUMO_CV_RH: String,
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
                    LIVROS_PUBLICADOS_OU_ORGANIZADOS: [
                        {   NATUREZA: String,
                            TITULO_DO_LIVRO: String,
                            TITULO_DO_LIVRO_INGLES: String,
                            PAIS_DE_PUBLICACAO: String,
                            IDIOMA: String,
                            MEIO_DE_DIVULGACAO: String,
                            ANO: String,
                            NOME_DA_EDITORA: String,
                            NUMERO_DE_PAGINAS: String,
                            DOI: String,
                            TIPO:String,
                            HOME_PAGE_DO_TRABALHO:String,
                            NUMERO_DE_VOLUMES: String,
                            NUMERO_DE_PAGINAS: String,
                            ISBN: String,
                            AUTORES: [
                                {
                                    NOME_COMPLETO_DO_AUTOR: String,
                                    ORDEM_DE_AUTORIA: String,
                                    ID_Lattes: String,

                                }
                            ],
                            PALAVRAS_CHAVE:{
                                PALAVRA_CHAVE_1: String,
                                PALAVRA_CHAVE_2: String,
                                PALAVRA_CHAVE_3: String,
                                PALAVRA_CHAVE_4: String,
                                PALAVRA_CHAVE_5: String,
                                PALAVRA_CHAVE_6: String,
                            },

                        },
                    ],
                    CAPITULO_DE_LIVROS_PUBLICADOS:[
                        {
                            TIPO:String,
                            TITULO_DO_CAPITULO_DO_LIVRO: String,
                            ANO: String,
                            PAIS_DE_PUBLICACAO:String,
                            IDIOMA:String,
                            MEIO_DE_DIVULGACAO:String,	
                            HOME_PAGE_DO_TRABALHO:String,
                            DOI:String,
                            TITULO_DO_CAPITULO_DO_LIVRO_INGLES:String, 
                            TITULO_DO_LIVRO: String,
                            NUMERO_DE_VOLUMES: String,
                            NUMERO_DE_PAGINAS: String,
                            ISBN:String,
                            AUTORES: [
                                {
                                    NOME_COMPLETO_DO_AUTOR: String,
                                    ORDEM_DE_AUTORIA: String,
                                    ID_Lattes: String,

                                }
                            ],
                            PALAVRAS_CHAVE:{
                                PALAVRA_CHAVE_1: String,
                                PALAVRA_CHAVE_2: String,
                                PALAVRA_CHAVE_3: String,
                                PALAVRA_CHAVE_4: String,
                                PALAVRA_CHAVE_5: String,
                                PALAVRA_CHAVE_6: String,
                            },
                            
                        },

                    ],
                    
    
                },
            ],
            TRABALHOS_EM_EVENTOS: [
                {
                    NATUREZA:String,
                    TITULO_DO_TRABALHO: String,
                    ANO_DO_TRABALHO: String,
                    PAIS_DO_EVENTO: String,
                    IDIOMA:String,
                    MEIO_DE_DIVULGACAO:String,
                    HOME_PAGE_DO_TRABALHO: String,
                    DOI:String,
                    TITULO_DO_TRABALHO_INGLES:String,
                    CLASSIFICACAO_DO_EVENTO: String,
                    NOME_DO_EVENTO: String,
                    CIDADE_DO_EVENTO:String,
                    ANO_DE_REALIZACAO:String,
                    AUTORES: [
                        {
                            NOME_COMPLETO_DO_AUTOR: String,
                            ORDEM_DE_AUTORIA: String,
                            ID_Lattes: String,

                        }
                    ],
                    PALAVRAS_CHAVE:{
                        PALAVRA_CHAVE_1: String,
                        PALAVRA_CHAVE_2: String,
                        PALAVRA_CHAVE_3: String,
                        PALAVRA_CHAVE_4: String,
                        PALAVRA_CHAVE_5: String,
                        PALAVRA_CHAVE_6: String,
                    },

                   
                },
            ],
            TEXTO_EM_JORNAL_OU_REVISTA:[
                {
                    NATUREZA:String,
                    TITULO_DO_TEXTO: String,
                    ANO_DO_TEXTO: String,
                    PAIS_DE_PUBLICACAO: String,
                    IDIOMA:String,
                    MEIO_DE_DIVULGACAO:String,
                    HOME_PAGE_DO_TRABALHO: String,
                    DOI:String,
                    TITULO_DO_TRABALHO_INGLES:String,
                    TITULO_DO_JORNAL_OU_REVISTA:String,
                    ISSN:String,
                    DATA_DE_PUBLICACAO:String,
                    PAGINA_INICIAL:String,
                    PAGINA_FINAL:String,
                    LOCAL_DE_PUBLICACAO:String,
                    AUTORES: [
                        {
                            NOME_COMPLETO_DO_AUTOR: String,
                            ORDEM_DE_AUTORIA: String,
                            ID_Lattes: String,
                        },
                    ],
                    PALAVRAS_CHAVE:{
                        PALAVRA_CHAVE_1: String,
                        PALAVRA_CHAVE_2: String,
                        PALAVRA_CHAVE_3: String,
                        PALAVRA_CHAVE_4: String,
                        PALAVRA_CHAVE_5: String,
                        PALAVRA_CHAVE_6: String,
                    },


                },
            ],
        },
        PRODUCAO_TECNICA: {
            SOFTWARE: [
                {   TITULO_DO_SOFTWARE: String,
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
                {   TITULO: String,
                    TITULO_INGLES: String,
                    ANO_DESENVOLVIMENTO: String,
                    AUTORES: [
                        {
                            NOME_COMPLETO_DO_AUTOR: String,
                            ORDEM_DE_AUTORIA: String,
                            ID_Lattes: String,
                        },
                    ],
                    PAIS: String,
                    CODIGO_DO_REGISTRO_OU_PATENTE: String,
                    INSTITUICAO_DEPOSITO_REGISTRO: String,
                    HOME_PAGE: String,
                    DATA_DE_CONCESSAO: String,
                    DATA_DE_DEPOSITO: String,
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
                    TIPO_DE_ORIENTACAO: String,
                   
                },
            ],
            
        },
        ORIENTACOES_EM_ANDAMENTO: {
            ORIENTACOES_EM_ANDAMENTO_PARA_DOUTORADO: [
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
            ORIENTACOES_EM_ANDAMENTO_PARA_MESTRADO: [
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
            ORIENTACOES_EM_ANDAMENTO_PARA_POS_DOUTORADO: [
                {
                    NOME_DO_ORIENTADO: String,
                    ANO: String,
                    TITULO: String,
                    NOME_DA_INSTITUICAO: String,
                    NOME_DO_CURSO: String,
                    TIPO_DE_ORIENTACAO: String,
                   
                },
            ],
            
        },
    },
});

const lattesdb = mongoose.model('Lattes', LattesSchema);
module.exports = {lattesdb}