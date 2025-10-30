const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const xml2js = require('xml2js');
const jschardet = require('jschardet'); // Usando jschardet para detectar codificação
const iconv = require('iconv-lite'); // Importando o iconv-lite para conversão de codificação
const { lattesdb } = require('../models/Lattes');
const axios = require('axios');

const emptyCurriculo = {
    CURRICULO_VITAE: {
        ID_Lattes: "",
        DATA_ATUALIZACAO: "",
        DADOS_GERAIS: {
            NOME_COMPLETO: "",
            NOME_EM_CITACOES_BIBLIOGRAFICAS: "",
            NACIONALIDADE: "",
            PAIS_DE_NASCIMENTO: "",
            UF_NASCIMENTO: "",
            CIDADE_NASCIMENTO: "",
            DATA_FALECIMENTO: "",
            TEXTO_RESUMO_CV_RH_EN: "",
            TEXTO_RESUMO_CV_RH: "",
            ORCID_ID:""
        },
        FORMACAO_ACADEMICA_TITULACAO: {
            GRADUACAO: [],
            MESTRADO: {
                CURSO: "",
                NOME_INSTITUICAO: "",
                ANO_DE_CONCLUSAO: "",
                ANO_DE_INICIO: "",
                ANO_DE_OBTENCAO_DO_TITULO: "",
                PALAVRAS_CHAVE: {
                    PALAVRA_CHAVE_1: "",
                    PALAVRA_CHAVE_2: "",
                    PALAVRA_CHAVE_3: "",
                    PALAVRA_CHAVE_4: "",
                    PALAVRA_CHAVE_5: "",
                    PALAVRA_CHAVE_6: "",
                },
            },
            DOUTORADO: {
                CURSO: "",
                TITULO_DA_DISSERTACAO_TESE: "",
                NOME_INSTITUICAO: "",
                ANO_DE_CONCLUSAO: "",
                ANO_DE_INICIO: "",
                ANO_DE_OBTENCAO_DO_TITULO: "",
                PALAVRAS_CHAVE: {
                    PALAVRA_CHAVE_1: "",
                    PALAVRA_CHAVE_2: "",
                    PALAVRA_CHAVE_3: "",
                    PALAVRA_CHAVE_4: "",
                    PALAVRA_CHAVE_5: "",
                    PALAVRA_CHAVE_6: "",
                },
            },
            POS_DOUTORADO: {
                NOME_INSTITUICAO: "",
                ANO_DE_CONCLUSAO: "",
                ANO_DE_INICIO: "",
                ANO_DE_OBTENCAO_DO_TITULO: "",
            },
        },
        PRODUCAO_BIBLIOGRAFICA: {
            ARTIGOS_PUBLICADOS: [],
            LIVROS_E_CAPITULOS: [
                {
                    LIVROS_PUBLICADOS_OU_ORGANIZADOS:[],
                    CAPITULO_DE_LIVROS_PUBLICADOS:[],
                }
            ],
            TRABALHOS_EM_EVENTOS:[],
            TEXTO_EM_JORNAL_OU_REVISTA:[],
            PARTITURAS_MUSICAIS: [],
            OUTRAS_PRODUCOES_BIBLIOGRAFICAS: [],
        },
        PRODUCAO_TECNICA: {
            SOFTWARE: [],
            PATENTE: [],
        },

        ORIENTACOES_CONCLUIDAS: {
            ORIENTACOES_CONCLUIDAS_PARA_DOUTORADO: [],
            ORIENTACOES_CONCLUIDAS_PARA_MESTRADO: [],
            ORIENTACOES_CONCLUIDAS_PARA_POS_DOUTORADO: [],
        },
        ORIENTACOES_EM_ANDAMENTO: {
            ORIENTACOES_EM_ANDAMENTO_PARA_DOUTORADO: [],
            ORIENTACOES_EM_ANDAMENTO_PARA_MESTRADO: [],
            ORIENTACOES_EM_ANDAMENTO_PARA_POS_DOUTORADO: [],
        },
        PRODUCAO_ARTISTICA_CULTURAL:{
            ARTES_CENICAS: [],
            MUSICA: [],
        }
    },
};


const createLattes = async (req, res) => {
    try {
        const parser = new xml2js.Parser();
        const dir = path.join(__dirname, '../../xml_files');
        const folders = fs.readdirSync(dir);
        
        // Limpar o arquivo de log no início
        const failedLogPath = path.join(__dirname, '../../lattes_failed_files.log');
        fs.writeFileSync(failedLogPath, '');
        const failedFiles = [];
        
        // Primeiro deletar todos os registros existentes
        await lattesdb.deleteMany({});
        console.log('Dados antigos removidos com sucesso');

        // Array para acumular todos os currículos Lattes
        let curriculosParaSalvar = [];

        // Processar cada arquivo sequencialmente (para evitar sobrecarga de memória)
        for (const folder of folders) {
            const folderPath = path.join(dir, folder);
            const stat = fs.statSync(folderPath);

            if (!stat.isDirectory()) continue;

            const xmlPath = path.join(folderPath, `${folder}.xml`);
            if (!fs.existsSync(xmlPath)) continue;

            try {
                const fileBuffer = fs.readFileSync(xmlPath);
                let xml;
                try {
                    xml = iconv.decode(fileBuffer, 'ISO-8859-1');
                } catch (e) {
                    xml = fileBuffer.toString('utf-8');
                }

                const result = await parser.parseStringPromise(xml);
                const cvData = result['CURRICULO-VITAE'];
                
                // Criar o objeto no formato do seu schema
                const curriculo = JSON.parse(JSON.stringify(emptyCurriculo));
                
                // Pega ID Lattes e Data Atualização
                curriculo.CURRICULO_VITAE.ID_Lattes = cvData['$']['NUMERO-IDENTIFICADOR'] || folder;
                curriculo.CURRICULO_VITAE.DATA_ATUALIZACAO = cvData['$']['DATA-ATUALIZACAO'] || "";
                // DADOS GERAIS
                if (cvData['DADOS-GERAIS'] && cvData['DADOS-GERAIS'][0]) {
                    const dadosGerais = cvData['DADOS-GERAIS'][0]['$'] || {};
                    const resumo_cv = cvData['DADOS-GERAIS'][0]['RESUMO-CV']?.[0]?.['$'] || {};
                    curriculo.CURRICULO_VITAE.DADOS_GERAIS.NOME_COMPLETO = dadosGerais['NOME-COMPLETO'] || "";
                    curriculo.CURRICULO_VITAE.DADOS_GERAIS.NOME_EM_CITACOES_BIBLIOGRAFICAS = dadosGerais['NOME-EM-CITACOES-BIBLIOGRAFICAS'] || "";
                    curriculo.CURRICULO_VITAE.DADOS_GERAIS.NACIONALIDADE = dadosGerais['NACIONALIDADE'] || "";
                    curriculo.CURRICULO_VITAE.DADOS_GERAIS.PAIS_DE_NASCIMENTO = dadosGerais['PAIS-DE-NASCIMENTO'] || "";
                    curriculo.CURRICULO_VITAE.DADOS_GERAIS.UF_NASCIMENTO = dadosGerais['UF-NASCIMENTO'] || "";
                    curriculo.CURRICULO_VITAE.DADOS_GERAIS.CIDADE_NASCIMENTO = dadosGerais['CIDADE-NASCIMENTO'] || "";
                    curriculo.CURRICULO_VITAE.DADOS_GERAIS.TEXTO_RESUMO_CV_RH_EN = resumo_cv['TEXTO-RESUMO-CV-RH-EN'] || ""
                    curriculo.CURRICULO_VITAE.DADOS_GERAIS.TEXTO_RESUMO_CV_RH = resumo_cv['TEXTO-RESUMO-CV-RH'] || ""
                    curriculo.CURRICULO_VITAE.DADOS_GERAIS.ORCID_ID = dadosGerais['ORCID-ID'] || "";
                }
            
                // Produção Bibliográfica - ARTIGOS PUBLICADOS (exemplo básico)
                if (cvData['PRODUCAO-BIBLIOGRAFICA'] && cvData['PRODUCAO-BIBLIOGRAFICA'][0]['ARTIGOS-PUBLICADOS']) {
                    const artigos = cvData['PRODUCAO-BIBLIOGRAFICA'][0]['ARTIGOS-PUBLICADOS'][0]?.['ARTIGO-PUBLICADO'] || [];
                    for (let artigo of artigos) {
                        let dadosBasicos = artigo['DADOS-BASICOS-DO-ARTIGO']?.[0]?.['$'] || {};
                        const artigoObj = {
                            ID_Lattes: cvData['$']['NUMERO-IDENTIFICADOR'] || folder,
                            TITULO_DO_ARTIGO: dadosBasicos['TITULO-DO-ARTIGO'] || "",
                            TITULO_DO_ARTIGO_INGLES: dadosBasicos['TITULO-DO-ARTIGO-INGLES'] || "",
                            ANO_DO_ARTIGO: dadosBasicos['ANO-DO-ARTIGO'] || "",
                            AUTORES: [],
                            TITULO_DO_PERIODICO_OU_REVISTA: artigo['DETALHAMENTO-DO-ARTIGO']?.[0]?.['$']?.['TITULO-DO-PERIODICO-OU-REVISTA'] || "",
                            VOLUME: artigo['DETALHAMENTO-DO-ARTIGO']?.[0]?.['$']?.['VOLUME'] || "",
                            PAGINA_INICIAL: artigo['DETALHAMENTO-DO-ARTIGO']?.[0]?.['$']?.['PAGINA-INICIAL'] || "",
                            PAGINA_FINAL: artigo['DETALHAMENTO-DO-ARTIGO']?.[0]?.['$']?.['PAGINA-FINAL'] || "",
                            DOI: dadosBasicos['DOI'] || "",
                            ISSN: artigo['DETALHAMENTO-DO-ARTIGO']?.[0]?.['$']?.['ISSN'] || "",
                            IDIOMA: dadosBasicos['IDIOMA'] || "",
                            PALAVRAS_CHAVE: {
                                PALAVRA_CHAVE_1: "",
                                PALAVRA_CHAVE_2: "",  
                                PALAVRA_CHAVE_3: "",
                                PALAVRA_CHAVE_4: "",    
                                PALAVRA_CHAVE_5: "",
                                PALAVRA_CHAVE_6: ""
                            },
                            HOME_PAGE_DO_TRABALHO: dadosBasicos['HOME-PAGE-DO-TRABALHO'] || "",
                        };
                        // Ajustar ANO_DO_ARTIGO para Date (31/12/ANO)
                        if (artigoObj.ANO_DO_ARTIGO && /^\d{4}$/.test(artigoObj.ANO_DO_ARTIGO)) {
                            artigoObj.ANO_DO_ARTIGO = new Date(`${artigoObj.ANO_DO_ARTIGO}-12-31T00:00:00.000Z`);
                        } else {
                            artigoObj.ANO_DO_ARTIGO = null;
                        }
                        // Preencher autores
                        if (artigo['AUTORES']) {
                            for (let autor of artigo['AUTORES']) {
                                const autorObj = {
                                    NOME_COMPLETO_DO_AUTOR: autor['$']?.['NOME-COMPLETO-DO-AUTOR'] || "",
                                    ORDEM_DE_AUTORIA: autor['$']?.['ORDEM-DE-AUTORIA'] || "",
                                    ID_Lattes: autor['$']?.['NRO-ID-CNPQ'] || "",
                                };
                                artigoObj.AUTORES.push(autorObj);
                            }
                        }
                        if (artigo['PALAVRAS-CHAVE'] && artigo['PALAVRAS-CHAVE'][0]) {
                            const palavrasChave = artigo['PALAVRAS-CHAVE'][0]['$'] || {};
                            artigoObj.PALAVRAS_CHAVE.PALAVRA_CHAVE_1 = palavrasChave['PALAVRA-CHAVE-1'] || "";
                            artigoObj.PALAVRAS_CHAVE.PALAVRA_CHAVE_2 = palavrasChave['PALAVRA-CHAVE-2'] || "";
                            artigoObj.PALAVRAS_CHAVE.PALAVRA_CHAVE_3 = palavrasChave['PALAVRA-CHAVE-3'] || "";
                            artigoObj.PALAVRAS_CHAVE.PALAVRA_CHAVE_4 = palavrasChave['PALAVRA-CHAVE-4'] || "";
                            artigoObj.PALAVRAS_CHAVE.PALAVRA_CHAVE_5 = palavrasChave['PALAVRA-CHAVE-5'] || "";
                            artigoObj.PALAVRAS_CHAVE.PALAVRA_CHAVE_6 = palavrasChave['PALAVRA-CHAVE-6'] || "";
                        }
                        // Adicionar ao currículo normalmente
                        curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.ARTIGOS_PUBLICADOS.push(artigoObj);
                    }
                }

                // producao bibliográfica Livros e Capitulos
                if(cvData['PRODUCAO-BIBLIOGRAFICA'] && cvData['PRODUCAO-BIBLIOGRAFICA'][0]['LIVROS-E-CAPITULOS'] && cvData['PRODUCAO-BIBLIOGRAFICA'][0]['LIVROS-E-CAPITULOS'][0]){
                    
                    if(cvData['PRODUCAO-BIBLIOGRAFICA'][0]['LIVROS-E-CAPITULOS'][0]['LIVROS-PUBLICADOS-OU-ORGANIZADOS']){
                        const livros_publicados_ou_organizados = cvData['PRODUCAO-BIBLIOGRAFICA'][0]['LIVROS-E-CAPITULOS'][0]['LIVROS-PUBLICADOS-OU-ORGANIZADOS'][0]?.['LIVRO-PUBLICADO-OU-ORGANIZADO'] || []
                        for (let livro of livros_publicados_ou_organizados) {
                            const dadosBasicos = livro['DADOS-BASICOS-DO-LIVRO']?.[0]?.['$'] || {};
                            const detalhamento = livro['DETALHAMENTO-DO-LIVRO']?.[0]?.['$'] || {};
            
                            curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].LIVROS_PUBLICADOS_OU_ORGANIZADOS.push({
                                NATUREZA: dadosBasicos['NATUREZA'] || "",
                                TITULO_DO_LIVRO_INGLES:dadosBasicos['TITULO-DO-LIVRO-INGLES'] || "",
                                TITULO_DO_LIVRO: dadosBasicos['TITULO-DO-LIVRO'] || "",
                                ANO: dadosBasicos['ANO'] || "",
                                PAIS_DE_PUBLICACAO: dadosBasicos['PAIS-DE-PUBLICACAO'] || "",
                                IDIOMA: dadosBasicos['IDIOMA'] || "",
                                MEIO_DE_DIVULGACAO: dadosBasicos['MEIO-DE-DIVULGACAO'] || "",
                                HOME_PAGE_DO_TRABALHO: dadosBasicos['HOME-PAGE-DO-TRABALHO'] || "",
                                DOI: dadosBasicos['DOI'] || "",
                                NOME_DA_EDITORA: detalhamento['NOME-DA-EDITORA'] || "",
                                NUMERO_DE_PAGINAS: detalhamento['NUMERO-DE-PAGINAS'] || "",
                                TIPO: dadosBasicos['TIPO'] || "",
                                ISBN: detalhamento['ISBN'] || "",
                                NUMERO_DE_VOLUMES: detalhamento['NUMERO-DE-VOLUMES'] || "",
                                NUMERO_DE_PAGINAS:detalhamento['NUMERO-DE-PAGINAS'] || "",
                                AUTORES: [],
                                PALAVRAS_CHAVE: {
                                    PALAVRA_CHAVE_1: "",
                                    PALAVRA_CHAVE_2: "",
                                    PALAVRA_CHAVE_3: "",
                                    PALAVRA_CHAVE_4: "",
                                    PALAVRA_CHAVE_5: "",
                                    PALAVRA_CHAVE_6: "",
                                },
                            });
            
                            // Preencher autores
                            if (livro['AUTORES']) {
                                for (let autor of livro['AUTORES']) {
                                    curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].LIVROS_PUBLICADOS_OU_ORGANIZADOS.at(-1).AUTORES.push({
                                        NOME_COMPLETO_DO_AUTOR: autor['$']?.['NOME-COMPLETO-DO-AUTOR'] || "",
                                        ORDEM_DE_AUTORIA: autor['$']?.['ORDEM-DE-AUTORIA'] || "",
                                        ID_Lattes: autor['$']?.['NRO-ID-CNPQ'] || "",
                                    });
                                }
                            }
            
                            // Preencher palavras-chave
                            if (livro['PALAVRAS-CHAVE'] && livro['PALAVRAS-CHAVE'][0]) {
                                const palavrasChave = livro['PALAVRAS-CHAVE'][0]['$'] || {};
                                const palavrasChaveObj = curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].LIVROS_PUBLICADOS_OU_ORGANIZADOS.at(-1).PALAVRAS_CHAVE;
            
                                palavrasChaveObj.PALAVRA_CHAVE_1 = palavrasChave['PALAVRA-CHAVE-1'] || "";
                                palavrasChaveObj.PALAVRA_CHAVE_2 = palavrasChave['PALAVRA-CHAVE-2'] || "";
                                palavrasChaveObj.PALAVRA_CHAVE_3 = palavrasChave['PALAVRA-CHAVE-3'] || "";
                                palavrasChaveObj.PALAVRA_CHAVE_4 = palavrasChave['PALAVRA-CHAVE-4'] || "";
                                palavrasChaveObj.PALAVRA_CHAVE_5 = palavrasChave['PALAVRA-CHAVE-5'] || "";
                                palavrasChaveObj.PALAVRA_CHAVE_6 = palavrasChave['PALAVRA-CHAVE-6'] || "";
                            }

                            // Ajustar ANO do livro para Date (31/12/ANO)
                            if (curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].LIVROS_PUBLICADOS_OU_ORGANIZADOS.at(-1).ANO && 
                                /^\d{4}$/.test(curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].LIVROS_PUBLICADOS_OU_ORGANIZADOS.at(-1).ANO)) {
                                curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].LIVROS_PUBLICADOS_OU_ORGANIZADOS.at(-1).ANO = 
                                    new Date(`${curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].LIVROS_PUBLICADOS_OU_ORGANIZADOS.at(-1).ANO}-12-31T00:00:00.000Z`);
                            } else {
                                curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].LIVROS_PUBLICADOS_OU_ORGANIZADOS.at(-1).ANO = null;
                            }
                        }
            
                    }
                    
                    
                    
                    if(cvData['PRODUCAO-BIBLIOGRAFICA'][0]['LIVROS-E-CAPITULOS'][0]['CAPITULOS-DE-LIVROS-PUBLICADOS']){
                            const capitulos_de_livros_publicados = cvData['PRODUCAO-BIBLIOGRAFICA'][0]['LIVROS-E-CAPITULOS'][0]['CAPITULOS-DE-LIVROS-PUBLICADOS'][0]?.['CAPITULO-DE-LIVRO-PUBLICADO'] || []
                
                    
                            for (let capitulo of capitulos_de_livros_publicados) {
                                const dadosBasicos = capitulo['DADOS-BASICOS-DO-CAPITULO']?.[0]?.['$'] || {};
                                const detalhamento = capitulo['DETALHAMENTO-DO-CAPITULO']?.[0]?.['$'] || {};

                                curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].CAPITULO_DE_LIVROS_PUBLICADOS.push({
                                    TIPO:dadosBasicos['TIPO'] || "",
                                    TITULO_DO_CAPITULO_DO_LIVRO: dadosBasicos['TITULO-DO-CAPITULO-DO-LIVRO'] || "",
                                    TITULO_DO_CAPITULO_DO_LIVRO_INGLES: dadosBasicos['TITULO-DO-CAPITULO-DO-LIVRO-INGLES'] || "",
                                    ANO: dadosBasicos['ANO'] || "",
                                    PAIS_DE_PUBLICACAO: dadosBasicos['PAIS-DE-PUBLICACAO'] || "",
                                    IDIOMA: dadosBasicos['IDIOMA'] || "",
                                    MEIO_DE_DIVULGACAO: dadosBasicos['MEIO-DE-DIVULGACAO'] || "",
                                    HOME_PAGE_DO_TRABALHO: dadosBasicos['HOME-PAGE-DO-TRABALHO'] || "",
                                    DOI: dadosBasicos['DOI'] || "",
                                    TITULO_DO_LIVRO: detalhamento['TITULO-DO-LIVRO'] || "",
                                    NUMERO_DE_VOLUMES: detalhamento['NUMERO-DE-VOLUMES'] || "",
                                    NOME_DA_EDITORA: detalhamento['NOME-DA-EDITORA'] || "",
                                    NUMERO_DE_PAGINAS: detalhamento['NUMERO-DE-PAGINAS'] || "",
                                    PAGINA_FINAL:detalhamento['PAGINA-FINAL'] || "",
                                    ISBN:detalhamento['ISBN'] || "" ,
                                    AUTORES: [],
                                    PALAVRAS_CHAVE: {
                                        PALAVRA_CHAVE_1: "",
                                        PALAVRA_CHAVE_2: "",
                                        PALAVRA_CHAVE_3: "",
                                        PALAVRA_CHAVE_4: "",
                                        PALAVRA_CHAVE_5: "",
                                        PALAVRA_CHAVE_6: "",
                                    },
                                });

                                // Preencher autores
                                if (capitulo['AUTORES']) {
                                    for (let autor of capitulo['AUTORES']) {
                                        curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].CAPITULO_DE_LIVROS_PUBLICADOS.at(-1).AUTORES.push({
                                            NOME_COMPLETO_DO_AUTOR: autor['$']?.['NOME-COMPLETO-DO-AUTOR'] || "",
                                            ORDEM_DE_AUTORIA: autor['$']?.['ORDEM-DE-AUTORIA'] || "",
                                            ID_Lattes: autor['$']?.['NRO-ID-CNPQ'] || "",
                                        });
                                    }
                                }

                                // Preencher palavras-chave
                                if (capitulo['PALAVRAS-CHAVE'] && capitulo['PALAVRAS-CHAVE'][0]) {
                                    const palavrasChave = capitulo['PALAVRAS-CHAVE'][0]['$'] || {};
                                    const palavrasChaveObj = curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].CAPITULO_DE_LIVROS_PUBLICADOS.at(-1).PALAVRAS_CHAVE;

                                    palavrasChaveObj.PALAVRA_CHAVE_1 = palavrasChave['PALAVRA-CHAVE-1'] || "";
                                    palavrasChaveObj.PALAVRA_CHAVE_2 = palavrasChave['PALAVRA-CHAVE-2'] || "";
                                    palavrasChaveObj.PALAVRA_CHAVE_3 = palavrasChave['PALAVRA-CHAVE-3'] || "";
                                    palavrasChaveObj.PALAVRA_CHAVE_4 = palavrasChave['PALAVRA-CHAVE-4'] || "";
                                    palavrasChaveObj.PALAVRA_CHAVE_5 = palavrasChave['PALAVRA-CHAVE-5'] || "";
                                    palavrasChaveObj.PALAVRA_CHAVE_6 = palavrasChave['PALAVRA-CHAVE-6'] || "";
                                }

                                // Ajustar ANO do capítulo para Date (31/12/ANO)
                                if (curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].CAPITULO_DE_LIVROS_PUBLICADOS.at(-1).ANO && 
                                    /^\d{4}$/.test(curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].CAPITULO_DE_LIVROS_PUBLICADOS.at(-1).ANO)) {
                                    curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].CAPITULO_DE_LIVROS_PUBLICADOS.at(-1).ANO = 
                                        new Date(`${curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].CAPITULO_DE_LIVROS_PUBLICADOS.at(-1).ANO}-12-31T00:00:00.000Z`);
                                } else {
                                    curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].CAPITULO_DE_LIVROS_PUBLICADOS.at(-1).ANO = null;
                                }
                        }
                    }
                    
                    
                }    
                    

                if(cvData['PRODUCAO-BIBLIOGRAFICA'] && cvData['PRODUCAO-BIBLIOGRAFICA'][0]['TRABALHOS-EM-EVENTOS']){
                    const trabalhos_em_eventos = cvData['PRODUCAO-BIBLIOGRAFICA'][0]['TRABALHOS-EM-EVENTOS'][0]?.['TRABALHO-EM-EVENTOS'] || []
                    
                    
                    for(let trabalho of trabalhos_em_eventos){
                        const dadosBasicos = trabalho['DADOS-BASICOS-DO-TRABALHO']?.[0]?.['$'] || {}
                        const detalhamento = trabalho['DETALHAMENTO-DO-TRABALHO']?.[0]?.['$'] || {}

                        curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.TRABALHOS_EM_EVENTOS.push({

                            NATUREZA:dadosBasicos['NATUREZA'],
                            TITULO_DO_TRABALHO: dadosBasicos['TITULO-DO-TRABALHO'],
                            ANO_DO_TRABALHO: dadosBasicos['ANO-DO-TRABALHO'] ,
                            PAIS_DO_EVENTO: dadosBasicos['PAIS-DO-EVENTO'],
                            IDIOMA:dadosBasicos['IDIOMA'],
                            MEIO_DE_DIVULGACAO:dadosBasicos['MEIO-DE-DIVULGACAO'],
                            HOME_PAGE_DO_TRABALHO: dadosBasicos['HOME-PAGE-DO-TRABALHO'] ,
                            DOI: dadosBasicos['DOI'],
                            TITULO_DO_TRABALHO_INGLES:dadosBasicos['TITULO-DO-TRABALHO-INGLES'],
                            CLASSIFICACAO_DO_EVENTO:detalhamento['CLASSIFICACAO-DO-EVENTO'] ,
                            NOME_DO_EVENTO: detalhamento['NOME-DO-EVENTO'],
                            CIDADE_DO_EVENTO:detalhamento['CIDADE-DO-EVENTO'],
                            ANO_DE_REALIZACAO:detalhamento['ANO-DE-REALIZACAO'],
                            AUTORES: [],
                            PALAVRAS_CHAVE: {
                                PALAVRA_CHAVE_1: "",
                                PALAVRA_CHAVE_2: "",  
                                PALAVRA_CHAVE_3: "",
                                PALAVRA_CHAVE_4: "",    
                                PALAVRA_CHAVE_5: "",
                                PALAVRA_CHAVE_6: ""},
                        
                    
                        });



                        // Preencher autores
                        if (trabalho['AUTORES']) {
                            for (let autor of trabalho['AUTORES']) {
                                curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.TRABALHOS_EM_EVENTOS.at(-1).AUTORES.push({
                                    NOME_COMPLETO_DO_AUTOR: autor['$']?.['NOME-COMPLETO-DO-AUTOR'] || "",
                                    ORDEM_DE_AUTORIA: autor['$']?.['ORDEM-DE-AUTORIA'] || "",
                                    ID_Lattes: autor['$']?.['NRO-ID-CNPQ'] || "",
                                });
                            }
                        }
                        if (trabalho['PALAVRAS-CHAVE'] && trabalho['PALAVRAS-CHAVE'][0]) {
                            const palavrasChave = trabalho['PALAVRAS-CHAVE'][0]['$'] || {};
                            const palavrasChaveObj = curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.TRABALHOS_EM_EVENTOS.at(-1).PALAVRAS_CHAVE;
                        
                            palavrasChaveObj.PALAVRA_CHAVE_1 = palavrasChave['PALAVRA-CHAVE-1'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_2 = palavrasChave['PALAVRA-CHAVE-2'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_3 = palavrasChave['PALAVRA-CHAVE-3'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_4 = palavrasChave['PALAVRA-CHAVE-4'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_5 = palavrasChave['PALAVRA-CHAVE-5'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_6 = palavrasChave['PALAVRA-CHAVE-6'] || "";
                        }
                        
                        // Ajustar ANO_DO_TRABALHO para Date (31/12/ANO)
                        if (curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.TRABALHOS_EM_EVENTOS.at(-1).ANO_DO_TRABALHO && 
                            /^\d{4}$/.test(curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.TRABALHOS_EM_EVENTOS.at(-1).ANO_DO_TRABALHO)) {
                            curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.TRABALHOS_EM_EVENTOS.at(-1).ANO_DO_TRABALHO = 
                                new Date(`${curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.TRABALHOS_EM_EVENTOS.at(-1).ANO_DO_TRABALHO}-12-31T00:00:00.000Z`);
                        } else {
                            curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.TRABALHOS_EM_EVENTOS.at(-1).ANO_DO_TRABALHO = null;
                        }
                    }
                    
                }

                if(cvData['PRODUCAO-BIBLIOGRAFICA'] && cvData['PRODUCAO-BIBLIOGRAFICA'][0]['DEMAIS-TIPOS-DE-PRODUCAO-BIBLIOGRAFICA']){
                    const outra_producao_bibliografica = cvData['PRODUCAO-BIBLIOGRAFICA'][0]['DEMAIS-TIPOS-DE-PRODUCAO-BIBLIOGRAFICA'][0]?.['OUTRA-PRODUCAO-BIBLIOGRAFICA'] || [];
                    const partitura_musical = cvData['PRODUCAO-BIBLIOGRAFICA'][0]['DEMAIS-TIPOS-DE-PRODUCAO-BIBLIOGRAFICA'][0]?.['PARTITURA-MUSICAL'] || [];
                    for (let producao of outra_producao_bibliografica) {
                        const dadosBasicos = producao['DADOS-BASICOS-DE-OUTRA-PRODUCAO']?.[0]?.['$'] || {};
                        const detalhamento = producao['DETALHAMENTO-DE-OUTRA-PRODUCAO']?.[0]?.['$'] || {};

                        curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.OUTRAS_PRODUCOES_BIBLIOGRAFICAS.push({
                            NATUREZA: dadosBasicos['NATUREZA'] || "",
                            TITULO: dadosBasicos['TITULO'] || "",
                            ANO: dadosBasicos['ANO'] || "",
                            IDIOMA: dadosBasicos['IDIOMA'] || "",
                            MEIO_DE_DIVULGACAO: dadosBasicos['MEIO-DE-DIVULGACAO'] || "",
                            HOME_PAGE_DO_TRABALHO: dadosBasicos['HOME-PAGE-DO-TRABALHO'] || "",
                            DOI: dadosBasicos['DOI'] || "",
                            PAIS_DE_PUBLICACAO: dadosBasicos['PAIS-DE-PUBLICACAO'] || "",
                            TITULO_INGLES: dadosBasicos['TITULO-INGLES'] || "",
                            EDITORA: detalhamento['EDITORA'] || "",
                            NUMERO_DE_PAGINAS: detalhamento['NUMERO-DE-PAGINAS'] || "",
                            CIDADE_EDITORA: detalhamento['CIDADE-DA-EDITORA'] || "",

                            AUTORES: [],
                            PALAVRAS_CHAVE: {
                                PALAVRA_CHAVE_1: "",
                                PALAVRA_CHAVE_2: "",  
                                PALAVRA_CHAVE_3: "",
                                PALAVRA_CHAVE_4: "",    
                                PALAVRA_CHAVE_5: "",
                                PALAVRA_CHAVE_6: ""
                            },
                        });

                        // Preencher autores
                        if (producao['AUTORES']) {
                            for (let autor of producao['AUTORES']) {
                                curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.OUTRAS_PRODUCOES_BIBLIOGRAFICAS.at(-1).AUTORES.push({
                                    NOME_COMPLETO_DO_AUTOR: autor['$']?.['NOME-COMPLETO-DO-AUTOR'] || "",
                                    ORDEM_DE_AUTORIA: autor['$']?.['ORDEM-DE-AUTORIA'] || "",
                                    ID_Lattes: autor['$']?.['NRO-ID-CNPQ'] || "",
                                });
                            }
                        }

                        // Preencher palavras-chave
                        if (producao['PALAVRAS-CHAVE'] && producao['PALAVRAS-CHAVE'][0]) {
                            const palavrasChave = producao['PALAVRAS-CHAVE'][0]['$'] || {};
                            const palavrasChaveObj = curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.OUTRAS_PRODUCOES_BIBLIOGRAFICAS.at(-1).PALAVRAS_CHAVE;
                            palavrasChaveObj.PALAVRA_CHAVE_1 = palavrasChave['PALAVRA-CHAVE-1'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_2 = palavrasChave['PALAVRA-CHAVE-2'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_3 = palavrasChave['PALAVRA-CHAVE-3'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_4 = palavrasChave['PALAVRA-CHAVE-4'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_5 = palavrasChave['PALAVRA-CHAVE-5'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_6 = palavrasChave['PALAVRA-CHAVE-6'] || "";
                        }
                        // Ajustar ANO da produção bibliográfica para Date (31/12/ANO)
                        if (curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.OUTRAS_PRODUCOES_BIBLIOGRAFICAS.at(-1).ANO &&
                            /^\d{4}$/.test(curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.OUTRAS_PRODUCOES_BIBLIOGRAFICAS.at(-1).ANO)) {
                            curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.OUTRAS_PRODUCOES_BIBLIOGRAFICAS.at(-1).ANO = 
                                new Date(`${curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.OUTRAS_PRODUCOES_BIBLIOGRAFICAS.at(-1).ANO}-12-31T00:00:00.000Z`);
                        } else {
                            curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.OUTRAS_PRODUCOES_BIBLIOGRAFICAS.at(-1).ANO = null;
                        }
                    }

                    for (let partitura of partitura_musical) {
                        const dadosBasicos = partitura['DADOS-BASICOS-DA-PARTITURA']?.[0]?.['$'] || {};
                        const detalhamento = partitura['DETALHAMENTO-DA-PARTITURA']?.[0]?.['$'] || {};
                        curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.PARTITURAS_MUSICAIS.push({
                            NATUREZA: dadosBasicos['NATUREZA'] || "",
                            TITULO: dadosBasicos['TITULO'] || "",
                            ANO: dadosBasicos['ANO'] || "",
                            IDIOMA: dadosBasicos['IDIOMA'] || "",
                            MEIO_DE_DIVULGACAO: dadosBasicos['MEIO-DE-DIVULGACAO'] || "",
                            HOME_PAGE_DO_TRABALHO: dadosBasicos['HOME-PAGE-DO-TRABALHO'] || "",
                            DOI: dadosBasicos['DOI'] || "",
                            PAIS_DE_PUBLICACAO: dadosBasicos['PAIS-DE-PUBLICACAO'] || "",
                            TITULO_INGLES: dadosBasicos['TITULO-INGLES'] || "",
                            EDITORA: detalhamento['EDITORA'] || "",
                            NUMERO_DE_PAGINAS: detalhamento['NUMERO-DE-PAGINAS'] || "",
                            CIDADE_EDITORA: detalhamento['CIDADE-DA-EDITORA'] || "",
                            NUMERO_DE_PAGINAS: detalhamento['NUMERO-DE-PAGINAS'] || "",
                            NUMERO_DO_CATALOGO: detalhamento['NUMERO-DO-CATALOGO'] || "",
                            AUTORES: [],
                            PALAVRAS_CHAVE: {
                                PALAVRA_CHAVE_1: "",
                                PALAVRA_CHAVE_2: "",
                                PALAVRA_CHAVE_3: "",
                                PALAVRA_CHAVE_4: "",
                                PALAVRA_CHAVE_5: "",
                                PALAVRA_CHAVE_6: ""
                            },
                        });
                        // Preencher autores
                        if (partitura['AUTORES']) {
                            for (let autor of partitura['AUTORES']) {
                                curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.PARTITURAS_MUSICAIS.at(-1).AUTORES.push({
                                    NOME_COMPLETO_DO_AUTOR: autor['$']?.['NOME-COMPLETO-DO-AUTOR'] || "",
                                    ORDEM_DE_AUTORIA: autor['$']?.['ORDEM-DE-AUTORIA'] || "",
                                    ID_Lattes: autor['$']?.['NRO-ID-CNPQ'] || "",
                                });
                            }

                        }
                        // Preencher palavras-chave
                        if (partitura['PALAVRAS-CHAVE'] && partitura['PALAVRAS-CHAVE'][0]) {
                            const palavrasChave = partitura['PALAVRAS-CHAVE'][0]['$'] || {};
                            const palavrasChaveObj = curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.PARTITURAS_MUSICAIS.at(-1).PALAVRAS_CHAVE;
                            palavrasChaveObj.PALAVRA_CHAVE_1 = palavrasChave['PALAVRA-CHAVE-1'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_2 = palavrasChave['PALAVRA-CHAVE-2'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_3 = palavrasChave['PALAVRA-CHAVE-3'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_4 = palavrasChave['PALAVRA-CHAVE-4'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_5 = palavrasChave['PALAVRA-CHAVE-5'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_6 = palavrasChave['PALAVRA-CHAVE-6'] || "";
                        }
                        // Ajustar ANO da partitura para Date (31/12/ANO)
                        if (curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.PARTITURAS_MUSICAIS.at(-1).ANO &&
                            /^\d{4}$/.test(curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.PARTITURAS_MUSICAIS.at(-1).ANO)) {
                            curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.PARTITURAS_MUSICAIS.at(-1).ANO = 
                                new Date(`${curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.PARTITURAS_MUSICAIS.at(-1).ANO}-12-31T00:00:00.000Z`);
                        } else {
                            curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.PARTITURAS_MUSICAIS.at(-1).ANO = null;
                        }
                    }
                }

                if(cvData['OUTRA-PRODUCAO'] && cvData['OUTRA-PRODUCAO'][0]['PRODUCAO-ARTISTICA-CULTURAL']) {
                    const musica = cvData['OUTRA-PRODUCAO'][0]['PRODUCAO-ARTISTICA-CULTURAL'][0]?.['MUSICA'] || [];
                    const artes_cenicas = cvData['OUTRA-PRODUCAO'][0]['PRODUCAO-ARTISTICA-CULTURAL'][0]?.['ARTES-CENICAS'] || [];

                    for (let producao of musica) {
                        const dadosBasicos = producao['DADOS-BASICOS-DA-MUSICA']?.[0]?.['$'] || {};
                        const detalhamento = producao['DETALHAMENTO-DA-MUSICA']?.[0]?.['$'] || {};
                        curriculo.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.MUSICA.push({
                            NATUREZA: dadosBasicos['NATUREZA'] || "",
                            TITULO: dadosBasicos['TITULO'] || "",
                            ANO: dadosBasicos['ANO'] || "",
                            IDIOMA: dadosBasicos['IDIOMA'] || "",
                            MEIO_DE_DIVULGACAO: dadosBasicos['MEIO-DE-DIVULGACAO'] || "",
                            HOME_PAGE: dadosBasicos['HOME-PAGE'] || "",
                            PAIS: dadosBasicos['PAIS'] || "",
                            TITULO_INGLES: dadosBasicos['TITULO-INGLES'] || "",
                            TIPO_DE_EVENTO: detalhamento['TIPO-DE-EVENTO'] || "",
                            DATA_ESTREIA: detalhamento['DATA-ESTREIA'] || "",
                            LOCAL_ESTREIA: detalhamento['LOCAL-ESTREIA'] || "",
                            DURACAO: detalhamento['DURACAO'] || "",
                            DATA_ENCERRAMENTO: detalhamento['DATA-ENCERRAMENTO'] || "",
                            INSTITUICAO_PROMOTORA_DO_EVENTO: detalhamento['INSTITUICAO-PROMOTORA-DO-EVENTO'] || "",
                            CIDADE_DO_EVENTO: detalhamento['CIDADE-DO-EVENTO'] || "",
                            LOCAL_DO_EVENTO: detalhamento['LOCAL-DO-EVENTO'] || "",
                            AUTORES: [],
                            PALAVRAS_CHAVE: {
                                PALAVRA_CHAVE_1: "",
                                PALAVRA_CHAVE_2: "",
                                PALAVRA_CHAVE_3: "",
                                PALAVRA_CHAVE_4: "",
                                PALAVRA_CHAVE_5: "",
                                PALAVRA_CHAVE_6: ""
                            },
                        });
                        // Preencher autores
                        if (producao['AUTORES']) { 
                            for (let autor of producao['AUTORES']) {
                                curriculo.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.MUSICA.at(-1).AUTORES.push({
                                    NOME_COMPLETO_DO_AUTOR: autor['$']?.['NOME-COMPLETO-DO-AUTOR'] || "",
                                    ORDEM_DE_AUTORIA: autor['$']?.['ORDEM-DE-AUTORIA'] || "",
                                    ID_Lattes: autor['$']?.['NRO-ID-CNPQ'] || "",
                                });
                            }
                        }
                        // Preencher palavras-chave
                        if (producao['PALAVRAS-CHAVE'] && producao['PALAVRAS-CHAVE'][0]) {
                            const palavrasChave = producao['PALAVRAS-CHAVE'][0]['$'] || {};
                            const palavrasChaveObj = curriculo.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.MUSICA.at(-1).PALAVRAS_CHAVE;

                            palavrasChaveObj.PALAVRA_CHAVE_1 = palavrasChave['PALAVRA-CHAVE-1'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_2 = palavrasChave['PALAVRA-CHAVE-2'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_3 = palavrasChave['PALAVRA-CHAVE-3'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_4 = palavrasChave['PALAVRA-CHAVE-4'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_5 = palavrasChave['PALAVRA-CHAVE-5'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_6 = palavrasChave['PALAVRA-CHAVE-6'] || "";
                        }
                        // Ajustar ANO da música para Date (31/12/ANO)
                        if (curriculo.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.MUSICA.at(-1).ANO &&
                            /^\d{4}$/.test(curriculo.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.MUSICA.at(-1).ANO)) {
                            curriculo.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.MUSICA.at(-1).ANO = 
                                new Date(`${curriculo.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.MUSICA.at(-1).ANO}-12-31T00:00:00.000Z`);
                        } else {
                            curriculo.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.MUSICA.at(-1).ANO = null;
                        }
                    }
                    for (let producao of artes_cenicas) {
                        const dadosBasicos = producao['DADOS-BASICOS-DE-ARTES-CENICAS']?.[0]?.['$'] || {};
                        const detalhamento = producao['DETALHAMENTO-DE-ARTES-CENICAS']?.[0]?.['$'] || {};
                        curriculo.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.ARTES_CENICAS.push({
                            NATUREZA: dadosBasicos['NATUREZA'] || "",
                            TITULO: dadosBasicos['TITULO'] || "",
                            TITULO_INGLES: dadosBasicos['TITULO-INGLES'] || "",
                            ANO: dadosBasicos['ANO'] || "",
                            IDIOMA: dadosBasicos['IDIOMA'] || "",
                            MEIO_DE_DIVULGACAO: dadosBasicos['MEIO-DE-DIVULGACAO'] || "",
                            HOME_PAGE: dadosBasicos['HOME-PAGE'] || "",
                            PAIS: dadosBasicos['PAIS'] || "",
                            TIPO_DE_EVENTO: detalhamento['TIPO-DE-EVENTO'] || "",
                            DATA_ESTREIA: detalhamento['DATA-ESTREIA'] || "",
                            LOCAL_ESTREIA: detalhamento['LOCAL-ESTREIA'] || "",
                            DURACAO: detalhamento['DURACAO'] || "",
                            DATA_ENCERRAMENTO: detalhamento['DATA-ENCERRAMENTO'] || "",
                            INSTITUICAO_PROMOTORA_DO_EVENTO: detalhamento['INSTITUICAO-PROMOTORA-DO-EVENTO'] || "",
                            CIDADE_DO_EVENTO: detalhamento['CIDADE-DO-EVENTO'] || "",
                            LOCAL_DE_ESTREIA: detalhamento['LOCAL-DE-ESTREIA'] || "",
                            AUTORES: [],
                            PALAVRAS_CHAVE: {
                                PALAVRA_CHAVE_1: "",
                                PALAVRA_CHAVE_2: "",
                                PALAVRA_CHAVE_3: "",
                                PALAVRA_CHAVE_4: "",
                                PALAVRA_CHAVE_5: "",
                                PALAVRA_CHAVE_6: ""
                            },
                        });
                        // Preencher autores
                        if (producao['AUTORES']) {
                            for (let autor of producao['AUTORES']) {
                                curriculo.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.ARTES_CENICAS.at(-1).AUTORES.push({
                                    NOME_COMPLETO_DO_AUTOR: autor['$']?.['NOME-COMPLETO-DO-AUTOR'] || "",
                                    ORDEM_DE_AUTORIA: autor['$']?.['ORDEM-DE-AUTORIA'] || "",
                                    ID_Lattes: autor['$']?.['NRO-ID-CNPQ'] || "",
                                });
                            }
                        }
                        // Preencher palavras-chave
                        if (producao['PALAVRAS-CHAVE'] && producao['PALAVRAS-CHAVE'][0]) {
                            const palavrasChave = producao['PALAVRAS-CHAVE'][0]['$'] || {};
                            const palavrasChaveObj = curriculo.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.ARTES_CENICAS.at(-1).PALAVRAS_CHAVE;
                            palavrasChaveObj.PALAVRA_CHAVE_1 = palavrasChave['PALAVRA-CHAVE-1'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_2 = palavrasChave['PALAVRA-CHAVE-2'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_3 = palavrasChave['PALAVRA-CHAVE-3'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_4 = palavrasChave['PALAVRA-CHAVE-4'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_5 = palavrasChave['PALAVRA-CHAVE-5'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_6 = palavrasChave['PALAVRA-CHAVE-6'] || "";
                        }
                        // Ajustar ANO das artes cênicas para Date (31/12/ANO)
                        if (curriculo.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.ARTES_CENICAS.at(-1).ANO &&
                            /^\d{4}$/.test(curriculo.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.ARTES_CENICAS.at(-1).ANO)) {
                            curriculo.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.ARTES_CENICAS.at(-1).ANO = 
                                new Date(`${curriculo.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.ARTES_CENICAS.at(-1).ANO}-12-31T00:00:00.000Z`);
                        } else {
                            curriculo.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.ARTES_CENICAS.at(-1).ANO = null;
                        }
                    }
                }
                           


            
                if (cvData['OUTRA-PRODUCAO'] && cvData['OUTRA-PRODUCAO'][0]['ORIENTACOES-CONCLUIDAS']) {
                    console.log('ENTROU NO IF OUTRAS PRODUCOES')
                    const orientacoes = cvData['OUTRA-PRODUCAO'][0]['ORIENTACOES-CONCLUIDAS'] || [];
                    
                    const orientacoes_mestrado = orientacoes[0]?.['ORIENTACOES-CONCLUIDAS-PARA-MESTRADO'] || [];
                    const orientacoes_doutorado = orientacoes[0]?.['ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO'] || [];
                    const orientacoes_pos_doutorado = orientacoes[0]?.['ORIENTACOES-CONCLUIDAS-PARA-POS-DOUTORADO'] || [];
                    for (let orientacao of orientacoes_mestrado) {
                        
                        const dadosBasicos = orientacao['DADOS-BASICOS-DE-ORIENTACOES-CONCLUIDAS-PARA-MESTRADO']?.[0]?.['$'] || {};
                        const detalhamento = orientacao['DETALHAMENTO-DE-ORIENTACOES-CONCLUIDAS-PARA-MESTRADO']?.[0]?.['$'] || {};
                        curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_MESTRADO.push({
                            NOME_DO_ORIENTADO: detalhamento['NOME-DO-ORIENTADO'] || "",
                            TITULO: dadosBasicos['TITULO'] || "",
                            ANO: dadosBasicos['ANO'] || "",
                            NOME_DA_INSTITUICAO: detalhamento['NOME-DA-INSTITUICAO'] || "",
                            NOME_DO_CURSO: detalhamento['NOME-DO-CURSO'] || "",
                            TIPO: dadosBasicos['TIPO'] || "",
                            TIPO_DE_ORIENTACAO: detalhamento['TIPO-DE-ORIENTACAO'] || "",
                        });

                        // Ajustar ANO da orientação de mestrado para Date (31/12/ANO)
                        if (curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_MESTRADO.at(-1).ANO && 
                            /^\d{4}$/.test(curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_MESTRADO.at(-1).ANO)) {
                            curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_MESTRADO.at(-1).ANO = 
                                new Date(`${curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_MESTRADO.at(-1).ANO}-12-31T00:00:00.000Z`);
                        } else {
                            curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_MESTRADO.at(-1).ANO = null;
                        }
                    }
                    for (let orientacao of orientacoes_doutorado) {
                        const dadosBasicos = orientacao['DADOS-BASICOS-DE-ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO']?.[0]?.['$'] || {};
                        const detalhamento = orientacao['DETALHAMENTO-DE-ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO']?.[0]?.['$'] || {};
                        curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_DOUTORADO.push({
                            NOME_DO_ORIENTADO: detalhamento['NOME-DO-ORIENTADO'] || "",
                            TITULO: dadosBasicos['TITULO'] || "",
                            ANO: dadosBasicos['ANO'] || "",
                            NOME_DA_INSTITUICAO: detalhamento['NOME-DA-INSTITUICAO'] || "",
                            NOME_DO_CURSO: detalhamento['NOME-DO-CURSO'] || "",
                            TIPO: dadosBasicos['TIPO'] || "",
                            TIPO_DE_ORIENTACAO: detalhamento['TIPO-DE-ORIENTACAO'] || "",
                        });

                        // Ajustar ANO da orientação de doutorado para Date (31/12/ANO)
                        if (curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_DOUTORADO.at(-1).ANO && 
                            /^\d{4}$/.test(curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_DOUTORADO.at(-1).ANO)) {
                            curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_DOUTORADO.at(-1).ANO = 
                                new Date(`${curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_DOUTORADO.at(-1).ANO}-12-31T00:00:00.000Z`);
                        } else {
                            curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_DOUTORADO.at(-1).ANO = null;
                        }
                    }
                    for (let orientacao of orientacoes_pos_doutorado) {
                        const dadosBasicos = orientacao['DADOS-BASICOS-DE-ORIENTACOES-CONCLUIDAS-PARA-POS-DOUTORADO']?.[0]?.['$'] || {};
                        const detalhamento = orientacao['DETALHAMENTO-DE-ORIENTACOES-CONCLUIDAS-PARA-POS-DOUTORADO']?.[0]?.['$'] || {};
                        curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_POS_DOUTORADO.push({
                            NOME_DO_ORIENTADO: detalhamento['NOME-DO-ORIENTADO'] || "",
                            TITULO: dadosBasicos['TITULO'] || "",
                            ANO: dadosBasicos['ANO'] || "",
                            NOME_DA_INSTITUICAO: detalhamento['NOME-DA-INSTITUICAO'] || "",
                            NOME_DO_CURSO: detalhamento['NOME-DO-CURSO'] || "",
                            TIPO: dadosBasicos['TIPO'] || "",
                            TIPO_DE_ORIENTACAO: detalhamento['TIPO-DE-ORIENTACAO'] || "",
                        });

                        // Ajustar ANO da orientação de pós-doutorado para Date (31/12/ANO)
                        if (curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_POS_DOUTORADO.at(-1).ANO && 
                            /^\d{4}$/.test(curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_POS_DOUTORADO.at(-1).ANO)) {
                            curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_POS_DOUTORADO.at(-1).ANO = 
                                new Date(`${curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_POS_DOUTORADO.at(-1).ANO}-12-31T00:00:00.000Z`);
                        } else {
                            curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_POS_DOUTORADO.at(-1).ANO = null;
                        }
                    }
                }

                if (cvData['DADOS-COMPLEMENTARES'] && cvData['DADOS-COMPLEMENTARES'][0]['ORIENTACOES-EM-ANDAMENTO']) {
                    const orientacoes = cvData['DADOS-COMPLEMENTARES'][0]['ORIENTACOES-EM-ANDAMENTO'] || [];
                    const orientacoes_mestrado = orientacoes[0]?.['ORIENTACAO-EM-ANDAMENTO-DE-MESTRADO'] || [];
                    const orientacoes_doutorado = orientacoes[0]?.['ORIENTACAO-EM-ANDAMENTO-DE-DOUTORADO'] || [];
                    const orientacoes_pos_doutorado = orientacoes[0]?.['ORIENTACAO-EM-ANDAMENTO-DE-POS-DOUTORADO'] || [];
                    for (let orientacao of orientacoes_mestrado) {
                        
                        const dadosBasicos = orientacao['DADOS-BASICOS-DA-ORIENTACAO-EM-ANDAMENTO-DE-MESTRADO']?.[0]?.['$'] || {};
                        const detalhamento = orientacao['DETALHAMENTO-DA-ORIENTACAO-EM-ANDAMENTO-DE-MESTRADO']?.[0]?.['$'] || {};
                        curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_MESTRADO.push({
                            NOME_DO_ORIENTADO: detalhamento['NOME-DO-ORIENTADO'] || "",
                            TITULO: dadosBasicos['TITULO-DO-TRABALHO'] || "",
                            ANO: dadosBasicos['ANO'] || "",
                            NOME_DA_INSTITUICAO: detalhamento['NOME-DA-INSTITUICAO'] || "",
                            NOME_DO_CURSO: detalhamento['NOME-DO-CURSO'] || "",
                            TIPO: dadosBasicos['TIPO'] || "",
                            TIPO_DE_ORIENTACAO: detalhamento['TIPO-DE-ORIENTACAO'] || "",
                        });

                        // Ajustar ANO da orientação em andamento de mestrado para Date (31/12/ANO)
                        if (curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_MESTRADO.at(-1).ANO && 
                            /^\d{4}$/.test(curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_MESTRADO.at(-1).ANO)) {
                            curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_MESTRADO.at(-1).ANO = 
                                new Date(`${curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_MESTRADO.at(-1).ANO}-12-31T00:00:00.000Z`);
                        } else {
                            curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_MESTRADO.at(-1).ANO = null;
                        }
                    }

                    for (let orientacao of orientacoes_doutorado) {
                        const dadosBasicos = orientacao['DADOS-BASICOS-DA-ORIENTACAO-EM-ANDAMENTO-DE-DOUTORADO']?.[0]?.['$'] || {};
                        const detalhamento = orientacao['DETALHAMENTO-DA-ORIENTACAO-EM-ANDAMENTO-DE-DOUTORADO']?.[0]?.['$'] || {};
                        curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_DOUTORADO.push({
                            NOME_DO_ORIENTADO: detalhamento['NOME-DO-ORIENTADO'] || "",
                            TITULO: dadosBasicos['TITULO-DO-TRABALHO'] || "",
                            ANO: dadosBasicos['ANO'] || "",
                            NOME_DA_INSTITUICAO: detalhamento['NOME-DA-INSTITUICAO'] || "",
                            NOME_DO_CURSO: detalhamento['NOME-DO-CURSO'] || "",
                            TIPO: dadosBasicos['TIPO'] || "",
                            TIPO_DE_ORIENTACAO: detalhamento['TIPO-DE-ORIENTACAO'] || "",
                        });

                        // Ajustar ANO da orientação em andamento de doutorado para Date (31/12/ANO)
                        if (curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_DOUTORADO.at(-1).ANO && 
                            /^\d{4}$/.test(curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_DOUTORADO.at(-1).ANO)) {
                            curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_DOUTORADO.at(-1).ANO = 
                                new Date(`${curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_DOUTORADO.at(-1).ANO}-12-31T00:00:00.000Z`);
                        } else {
                            curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_DOUTORADO.at(-1).ANO = null;
                        }
                    }

                    for (let orientacao of orientacoes_pos_doutorado) {
                        const dadosBasicos = orientacao['DADOS-BASICOS-DA-ORIENTACAO-EM-ANDAMENTO-DE-POS-DOUTORADO']?.[0]?.['$'] || {};
                        const detalhamento = orientacao['DETALHAMENTO-DA-ORIENTACAO-EM-ANDAMENTO-DE-POS-DOUTORADO']?.[0]?.['$'] || {};
                        curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_POS_DOUTORADO.push({
                            NOME_DO_ORIENTADO: detalhamento['NOME-DO-ORIENTADO'] || "",
                            TITULO: dadosBasicos['TITULO-DO-TRABALHO'] || "",
                            ANO: dadosBasicos['ANO'] || "",
                            NOME_DA_INSTITUICAO: detalhamento['NOME-DA-INSTITUICAO'] || "",
                            NOME_DO_CURSO: detalhamento['NOME-DO-CURSO'] || "",
                            TIPO: dadosBasicos['TIPO'] || "",
                            TIPO_DE_ORIENTACAO: detalhamento['TIPO-DE-ORIENTACAO'] || "",
                        });

                        // Ajustar ANO da orientação em andamento de pós-doutorado para Date (31/12/ANO)
                        if (curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_POS_DOUTORADO.at(-1).ANO && 
                            /^\d{4}$/.test(curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_POS_DOUTORADO.at(-1).ANO)) {
                            curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_POS_DOUTORADO.at(-1).ANO = 
                                new Date(`${curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_POS_DOUTORADO.at(-1).ANO}-12-31T00:00:00.000Z`);
                        } else {
                            curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_POS_DOUTORADO.at(-1).ANO = null;
                        }
                    }
                }
                
                if(cvData['PRODUCAO-TECNICA'] && cvData['PRODUCAO-TECNICA'][0]['SOFTWARE']){
                    const softwares = cvData['PRODUCAO-TECNICA'][0]['SOFTWARE'] || []
                    for(let software of softwares){
                        const dadosBasicos = software['DADOS-BASICOS-DO-SOFTWARE']?.[0]?.['$'] || {}
                        const detalhamento = software['DETALHAMENTO-DO-SOFTWARE']?.[0]?.['$'] || {}
                        curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.SOFTWARE.push({
                            TITULO_DO_SOFTWARE: dadosBasicos['TITULO-DO-SOFTWARE'] || "",
                            TITULO_DO_SOFTWARE_INGLES: dadosBasicos['TITULO-DO-SOFTWARE-INGLES'] || "",
                            ANO: dadosBasicos['ANO'] || "",
                            FINALIDADE: detalhamento['FINALIDADE'] || "",
                            HOME_PAGE: dadosBasicos['HOME-PAGE'] || "",
                            TIPO: dadosBasicos['TIPO'] || "",
                            AUTORES:[],
                            AMBIENTE: detalhamento['AMBIENTE'] || "",

                        }) 
                        // Preencher autores
                        if (software['AUTORES']) {
                            for (let autor of software['AUTORES']) {
                                curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.SOFTWARE.at(-1).AUTORES.push({
                                    NOME_COMPLETO_DO_AUTOR: autor['$']?.['NOME-COMPLETO-DO-AUTOR'] || "",
                                    ORDEM_DE_AUTORIA: autor['$']?.['ORDEM-DE-AUTORIA'] || "",
                                    ID_Lattes: autor['$']?.['NRO-ID-CNPQ'] || "",
                                });
                            }
                        }

                        // Ajustar ANO do software para Date (31/12/ANO)
                        if (curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.SOFTWARE.at(-1).ANO && 
                            /^\d{4}$/.test(curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.SOFTWARE.at(-1).ANO)) {
                            curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.SOFTWARE.at(-1).ANO = 
                                new Date(`${curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.SOFTWARE.at(-1).ANO}-12-31T00:00:00.000Z`);
                        } else {
                            curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.SOFTWARE.at(-1).ANO = null;
                        }
                    }}
                    if(cvData['PRODUCAO-TECNICA'] && cvData['PRODUCAO-TECNICA'][0]['PATENTE']){
                        const patentes = cvData['PRODUCAO-TECNICA'][0]['PATENTE'] || []
                        for(let patente of patentes){
                            const dadosBasicos = patente['DADOS-BASICOS-DA-PATENTE']?.[0]?.['$'] || {}
                            const detalhamento = patente['DETALHAMENTO-DA-PATENTE']?.[0]?.['$'] || {}
                            const registro_ou_patente = patente['DETALHAMENTO-DA-PATENTE']?.[0]?.['REGISTRO-OU-PATENTE']?.[0]?.['$'] || {}
                            curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.push({
                                TITULO: dadosBasicos['TITULO'] || "",
                                TITULO_INGLES: dadosBasicos['TITULO-INGLES'] || "",
                                ANO_DESENVOLVIMENTO: dadosBasicos['ANO_DESENVOLVIMENTO'] || "",
                                CODIGO_DO_REGISTRO_OU_PATENTE: registro_ou_patente['CODIGO-DO-REGISTRO-OU-PATENTE'] || "",
                                INSTITUICAO_DEPOSITO_REGISTRO: registro_ou_patente['INSTITUICAO-DEPOSITO-REGISTRO'] || "",
                                AUTORES: [],
                                PAIS: dadosBasicos['PAIS'] || "",
                                HOME_PAGE: dadosBasicos['HOME-PAGE'] || "",
                                DATA_DE_CONCESSAO: registro_ou_patente['DATA-DE-CONCESSAO'] || "",
                                DATA_DE_DEPOSITO: registro_ou_patente['DATA-PEDIDO-DE-DEPOSITO'] || "",
                            })
                            // Preencher autores
                            if (patente['AUTORES']) {
                                for (let autor of patente['AUTORES']) {
                                    curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.at(-1).AUTORES.push({
                                        NOME_COMPLETO_DO_AUTOR: autor['$']?.['NOME-COMPLETO-DO-AUTOR'] || "",
                                        ORDEM_DE_AUTORIA: autor['$']?.['ORDEM-DE-AUTORIA'] || "",
                                        ID_Lattes: autor['$']?.['NRO-ID-CNPQ'] || "",
                                    });
                                }
                            }

                            // Ajustar datas da patente para Date (mantendo formato original)
                            if (curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.at(-1).DATA_DE_DEPOSITO) {
                                const dataDeposito = curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.at(-1).DATA_DE_DEPOSITO;
                                if (dataDeposito.length === 8) {
                                    const dia = dataDeposito.substring(0, 2);
                                    const mes = dataDeposito.substring(2, 4);
                                    const ano = dataDeposito.substring(4, 8);
                                    curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.at(-1).DATA_DE_DEPOSITO = new Date(`${ano}-${mes}-${dia}`);
                                } else {
                                    curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.at(-1).DATA_DE_DEPOSITO = null;
                                }
                            } else {
                                curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.at(-1).DATA_DE_DEPOSITO = null;
                            }
                            if (curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.at(-1).DATA_DE_CONCESSAO) {
                                const dataConcessao = curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.at(-1).DATA_DE_CONCESSAO;
                                if (dataConcessao.length === 8) {
                                    const dia = dataConcessao.substring(0, 2);
                                    const mes = dataConcessao.substring(2, 4);
                                    const ano = dataConcessao.substring(4, 8);
                                    curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.at(-1).DATA_DE_CONCESSAO = new Date(`${ano}-${mes}-${dia}`);
                                } else {
                                    curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.at(-1).DATA_DE_CONCESSAO = null;
                                }
                            } else {
                                curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.at(-1).DATA_DE_CONCESSAO = null;
                            }
                        }}

                
                // Log do processamento do currículo
                console.log(`Processando currículo: Pasta=${folder}, ID_Lattes=${curriculo.CURRICULO_VITAE.ID_Lattes}`);
                // Ao final do processamento do currículo:
                // Só adiciona se ID_Lattes não for vazio e não estiver no array
                const idLattes = curriculo.CURRICULO_VITAE.ID_Lattes;
                if (idLattes && !curriculosParaSalvar.some(c => c.CURRICULO_VITAE.ID_Lattes === idLattes)) {
                    curriculosParaSalvar.push(curriculo);
                }
            } catch (err) {
                // Ignorar erro se for por falta de ID_Lattes
                if (err && err.message && err.message.includes('ID_Lattes')) {
                    console.warn(`Currículo ignorado por falta de ID_Lattes: ${folder}`);
                } else {
                    console.error(`Erro ao processar ${xmlPath}:`, err);
                    failedFiles.push(`${folder}.xml`);
                }
            }
        }

        // Após processar todos os arquivos, salvar todos os currículos em lotes de 5.000
        const BATCH_SIZE = 500;
        let totalCurriculos = curriculosParaSalvar.length;
        let batchCount = 0;
        while (curriculosParaSalvar.length > 0) {
            const batch = curriculosParaSalvar.splice(0, BATCH_SIZE);
            await lattesdb.insertMany(batch);
            batchCount++;
            console.log(`Lote ${batchCount} de currículos salvo (${batch.length} documentos, ${curriculosParaSalvar.length} restantes)`);
           
            // Forçar garbage collection se possível
            if (global.gc) {
                global.gc();
            }
        }

        // Salvar os arquivos que falharam no log, um por linha
        if (failedFiles.length > 0) {
            fs.appendFileSync(failedLogPath, failedFiles.join('\n') + '\n');
        }

        res.json({ message: "Processamento concluído com sucesso", total: folders.length, falhas: failedFiles.length });
    } catch (error) {
        console.error('Erro ao processar arquivos:', error);
        res.status(500).json({ error: error.message });
    }
};

const getLattes = async (req, res) => {
    try {
      const rawPage = req.query.page?.toString().trim();
      const page = parseInt(rawPage, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const skip = (page - 1) * limit;
  
      const filtro = { ID_Lattes: { $ne: null, $ne: "" } };
  
      const total = await lattesdb.countDocuments(filtro);
      const totalPages = Math.ceil(total / limit);
  
      // Evita pagina inválida
      if (page > totalPages && totalPages !== 0) {
        return res.status(400).json({ error: `Página ${page} não existe. Total de páginas: ${totalPages}` });
      }
  
      const curriculos = await lattesdb
        .find()
        .skip(skip)
        .limit(limit)
        
  
      res.status(200).json({
        total,
        page,
        totalPages,
        curriculos
      });
  
    } catch (err) {
      console.error('Erro em getLattes:', err);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  };
  
  
  
const getLattesbyId = async(req, res)=>{
    const id_lattes = req.params.id
    console.log(id_lattes);

    

    try{

        const resultQuery = await lattesdb.find({ "CURRICULO_VITAE.ID_Lattes": id_lattes })
        
        res.status(200).json({lattes:resultQuery[0]}) 
    }catch(err){
        res.status(500).json({ error: 'Internal server error'})
    }
}

const extrairTodosCurriculos= async(req, res) =>{
    const parser = new xml2js.Parser();
    const dir = path.join(__dirname, '../../xml_files');
    const folders = fs.readdirSync(dir);

    const failedLogPath = path.join(__dirname, '../../lattes_failed_files.log');
    fs.writeFileSync(failedLogPath, ''); // limpa o log

    const curriculos = [];
    const failedFiles = [];
    console.log(`Iniciando processamento de ${folders.length} pastas...`);
    for (const folder of folders) {
        const folderPath = path.join(dir, folder);
        const stat = fs.statSync(folderPath);
        if (!stat.isDirectory()) continue;

        const xmlPath = path.join(folderPath, `${folder}.xml`);
        if (!fs.existsSync(xmlPath)) continue;

        try {
            const fileBuffer = fs.readFileSync(xmlPath);
            let xml;
            try {
                xml = iconv.decode(fileBuffer, 'ISO-8859-1');
            } catch (e) {
                xml = fileBuffer.toString('utf-8');
            }

            const result = await parser.parseStringPromise(xml);
            const cvData = result['CURRICULO-VITAE'];

            if (cvData) {
                curriculos.push(cvData);
            } else {
                failedFiles.push(folder);
            }
        } catch (err) {
            console.error(`Erro ao processar ${folder}:`, err.message);
            failedFiles.push(folder);
        }
    }
    res.json({
        message: `Processamento concluído. Total de currículos extraídos: ${curriculos.length}`,
        curriculos,
        failedFiles: failedFiles.length > 0 ? failedFiles : null
    });

    if (failedFiles.length > 0) {
        fs.appendFileSync(failedLogPath, failedFiles.join('\n'));
    }
}
    

const getInternalId = async (req, res) => {
    const { id_lattes } = req.query;
  
    if (!id_lattes || !/^\d{16}$/.test(id_lattes)) {
      return res.status(400).json({ error: 'ID Lattes inválido ou ausente.' });
    }
  
    try {
      const result = await lattesdb.findOne({ "CURRICULO_VITAE.ID_Lattes": id_lattes });
      if (!result) {
        return res.status(404).json({ error: 'Currículo não encontrado na base de dados local' });
      }
  
      let currentUrl = `https://lattes.cnpq.br/${id_lattes}`;
      const MAX_REDIRECTS = 5;
  
      for (let i = 0; i < MAX_REDIRECTS; i++) {
        const urlObj = new URL(currentUrl);
        const idParam = urlObj.searchParams.get('id');
  
        // 1. CONDIÇÃO DE SUCESSO CORRIGIDA E ESPECÍFICA
        // Verifica se a página é a de visualização E se o ID contém letras (não é só numérico)
        if (urlObj.pathname.includes('/visualizacv.do') && idParam && /[a-zA-Z]/.test(idParam)) {
          console.log(`[SUCESSO REAL] - Encontrada URL final e ID alfanumérico: ${idParam}`);
          return res.json({ internalId: idParam });
        }
  
        console.log(`[REQUISIÇÃO ${i + 1}] - Acessando: ${currentUrl}`);
  
        try {
          await axios.get(currentUrl, {
            maxRedirects: 0,
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          return res.status(500).json({ error: 'O fluxo de redirecionamento do Lattes foi interrompido inesperadamente.' });
  
        } catch (error) {
          if (error.response && [301, 302].includes(error.response.status)) {
            const newLocation = error.response.headers.location;
            currentUrl = new URL(newLocation, currentUrl).href;
  
            // 2. FORÇANDO HTTPS PARA EVITAR ERRO DE CONEXÃO
            // Se o redirect nos mandar para http, nós corrigimos para https
            if (currentUrl.startsWith('http://')) {
              currentUrl = currentUrl.replace('http://', 'https://');
              console.log(`[INFO] - URL corrigida para HTTPS: ${currentUrl}`);
            }
            
          } else {
            throw error; // Lança outros erros (rede, etc.) para o catch principal
          }
        }
      }
  
      return res.status(404).json({ error: 'Não foi possível encontrar o ID interno após seguir todos os redirecionamentos.' });
  
    } catch (error) {
      console.error(`ERRO FINAL no processo para ${id_lattes}:`, error);
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({ error: `Conexão recusada pelo servidor: ${error.config?.url}` });
      }
      if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        return res.status(503).json({ error: 'Serviço do CNPq indisponível ou falha de conexão.' });
      }
      return res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }
  };
module.exports = {
    createLattes, getLattesbyId, getLattes, extrairTodosCurriculos, getInternalId
};



