const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const jschardet = require('jschardet'); // Usando jschardet para detectar codificação
const iconv = require('iconv-lite'); // Importando o iconv-lite para conversão de codificação
const { lattesdb } = require('../models/Lattes');
const ArtigoPublicado = require('../models/ArtigoPublicado');

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

        // Deletar todos os artigos publicados antes de inserir
        await ArtigoPublicado.deleteMany({});
        console.log('Artigos antigos removidos com sucesso');

        // Array para acumular todos os artigos publicados
        let artigosParaSalvar = [];
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
                        // Só adiciona se ID_Lattes não for vazio e não estiver no array
                        if (
                          artigoObj.ID_Lattes &&
                          !artigosParaSalvar.some(a =>
                            (artigoObj.DOI && a.DOI === artigoObj.DOI) ||
                            (!artigoObj.DOI &&
                              a.TITULO_DO_ARTIGO === artigoObj.TITULO_DO_ARTIGO &&
                              a.ANO_DO_ARTIGO?.getTime?.() === artigoObj.ANO_DO_ARTIGO?.getTime?.() &&
                              a.TITULO_DO_PERIODICO_OU_REVISTA === artigoObj.TITULO_DO_PERIODICO_OU_REVISTA &&
                              a.ID_Lattes === artigoObj.ID_Lattes
                            )
                          )
                        ) {
                          artigosParaSalvar.push(artigoObj);
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
                                DATA_DE_DEPOSITO: registro_ou_patente['DATA-PEDIDO-DE-DESPOSITO'] || "",

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
                                const [dia, mes, ano] = curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.at(-1).DATA_DE_DEPOSITO.split('/');
                                curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.at(-1).DATA_DE_DEPOSITO = new Date(`${ano}-${mes}-${dia}`);
                            }
                            if (curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.at(-1).DATA_DE_CONCESSAO) {
                                const [dia, mes, ano] = curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.at(-1).DATA_DE_CONCESSAO.split('/');
                                curriculo.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.at(-1).DATA_DE_CONCESSAO = new Date(`${ano}-${mes}-${dia}`);
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

        // Após processar todos os arquivos, salvar todos os artigos em lote
        if (artigosParaSalvar.length > 0) {
            await ArtigoPublicado.insertMany(artigosParaSalvar);
            console.log(`${artigosParaSalvar.length} artigos salvos com sucesso`);
            artigosParaSalvar = []; // Libera a referência
            if (global.gc) global.gc(); // Força garbage collection
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
    } catch (err) {
        console.error('Erro no processamento principal:', err);
        res.status(500).json({ error: "Erro no processamento" });
    }
};

const getLattes = async(req, res)=>{
    
    try{
        const resultQuery = await lattesdb.find({ })
   
        
        res.status(200).json({lattes:resultQuery.length}) 
    }catch(err){
        res.status(500).json({ error: 'Internal server error'})
    }
}
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

module.exports = {
    createLattes, getLattesbyId, getLattes
};



