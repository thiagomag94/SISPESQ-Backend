const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const jschardet = require('jschardet'); // Usando jschardet para detectar codificação
const iconv = require('iconv-lite'); // Importando o iconv-lite para conversão de codificação
const { lattesdb } = require('../models/Lattes');

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


const getLattes = async (req, res) => {
    const parser = new xml2js.Parser();
    const dir = path.join(__dirname, '../../xml_files');
    const folders = fs.readdirSync(dir); // Lista as pastas dentro de xml_files
    const lattes = [];
    const lattesSimplificado = [];

    // Percorre todas as pastas dentro de xml_files
    for (let folder of folders) {
        const folderPath = path.join(dir, folder);
        const stat = fs.statSync(folderPath);

        // Verifica se é uma pasta (não um arquivo)
        if (stat.isDirectory()) {
            const xmlPath = path.join(folderPath, 'curriculo.xml'); // Caminho para o arquivo curriculo.xml dentro da pasta

            // Verifica se o arquivo curriculo.xml existe e é um arquivo
            if (fs.existsSync(xmlPath) && fs.statSync(xmlPath).isFile()) {
                const fileBuffer = fs.readFileSync(xmlPath); // Lê o arquivo como buffer

                let xml;
                try {
                  xml = iconv.decode(fileBuffer, 'ISO-8859-1');
                } catch (e) {
                  console.warn(`Erro ao decodificar como ISO-8859-1, tentando UTF-8 como fallback...`);
                  xml = fileBuffer.toString('utf-8');
                }
                


                try {
                    const result = await parser.parseStringPromise(xml); // Usa parseStringPromise para evitar callback
                    
                    lattes.push(result);
                } catch (err) {
                    console.error(`Erro ao processar o arquivo ${xmlPath}:`, err);
                }
            }
        }
    }

    for(let cv of lattes){
        const indexof = lattes.indexOf(cv);
        console.log(indexof);
        //parte que deve ser implementada
        const curriculo = JSON.parse(JSON.stringify(emptyCurriculo)); // Faz uma cópia do objeto base
        const cvData = cv['CURRICULO-VITAE']; // Pega o objeto CURRICULO-VITAE do XML
        // Pega ID Lattes e Data Atualização
        curriculo.CURRICULO_VITAE.ID_Lattes = cvData['$']['NUMERO-IDENTIFICADOR'] || "";
        curriculo.CURRICULO_VITAE.DATA_ATUALIZACAO = cvData['$']['DATA-ATUALIZACAO'] || "";
        // DADOS GERAIS
        if (cvData['DADOS-GERAIS'] && cvData['DADOS-GERAIS'][0]) {
            const dadosGerais = cvData['DADOS-GERAIS'][0]['$'];
            const resumo_cv = cvData['DADOS-GERAIS'][0]['RESUMO-CV'][0]['$'];
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
            const artigos = cvData['PRODUCAO-BIBLIOGRAFICA'][0]['ARTIGOS-PUBLICADOS'][0]['ARTIGO-PUBLICADO'] || [];
            for (let artigo of artigos) {
                let dadosBasicos = artigo['DADOS-BASICOS-DO-ARTIGO'][0]['$'];
                curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.ARTIGOS_PUBLICADOS.push({
                    TITULO_DO_ARTIGO: dadosBasicos['TITULO-DO-ARTIGO'] || "",
                    TITULO_DO_ARTIGO_INGLES: dadosBasicos['TITULO-DO-ARTIGO-INGLES'] || "",
                    ANO_DO_ARTIGO: dadosBasicos['ANO-DO-ARTIGO'] || "",
                    AUTORES: [], // Preencher abaixo
                    TITULO_DO_PERIODICO_OU_REVISTA: artigo['DETALHAMENTO-DO-ARTIGO'][0]['$']['TITULO-DO-PERIODICO-OU-REVISTA'] || "",
                    VOLUME: artigo['DETALHAMENTO-DO-ARTIGO'][0]['$']['VOLUME'] || "",
                    PAGINA_INICIAL: artigo['DETALHAMENTO-DO-ARTIGO'][0]['$']['PAGINA-INICIAL'] || "",
                    PAGINA_FINAL: artigo['DETALHAMENTO-DO-ARTIGO'][0]['$']['PAGINA-FINAL'] || "",
                    DOI: dadosBasicos['DOI'] || "",
                    ISSN: artigo['DETALHAMENTO-DO-ARTIGO'][0]['$']['ISSN'] || "",
                    IDIOMA: dadosBasicos['IDIOMA'] || "",
                    PALAVRAS_CHAVE: {
                        PALAVRA_CHAVE_1: "",
                        PALAVRA_CHAVE_2: "",  
                        PALAVRA_CHAVE_3: "",
                        PALAVRA_CHAVE_4: "",    
                        PALAVRA_CHAVE_5: "",
                        PALAVRA_CHAVE_6: ""},
                    HOME_PAGE_DO_TRABALHO: dadosBasicos['HOME-PAGE-DO-TRABALHO'] || "",
               
                });

                // Preencher autores
                if (artigo['AUTORES']) {
                    for (let autor of artigo['AUTORES']) {
                        curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.ARTIGOS_PUBLICADOS.at(-1).AUTORES.push({
                            NOME_COMPLETO_DO_AUTOR: autor['$']['NOME-COMPLETO-DO-AUTOR'] || "",
                            ORDEM_DE_AUTORIA: autor['$']['ORDEM-DE-AUTORIA'] || "",
                            ID_Lattes: autor['$']['NRO-ID-CNPQ'] || "",
                        });
                    }
                }
                if (artigo['PALAVRAS-CHAVE'] && artigo['PALAVRAS-CHAVE'][0]) {
                    const palavrasChave = artigo['PALAVRAS-CHAVE'][0]['$'];
                    const palavrasChaveObj = curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.ARTIGOS_PUBLICADOS.at(-1).PALAVRAS_CHAVE;
                
                    palavrasChaveObj.PALAVRA_CHAVE_1 = palavrasChave['PALAVRA-CHAVE-1'] || "";
                    palavrasChaveObj.PALAVRA_CHAVE_2 = palavrasChave['PALAVRA-CHAVE-2'] || "";
                    palavrasChaveObj.PALAVRA_CHAVE_3 = palavrasChave['PALAVRA-CHAVE-3'] || "";
                    palavrasChaveObj.PALAVRA_CHAVE_4 = palavrasChave['PALAVRA-CHAVE-4'] || "";
                    palavrasChaveObj.PALAVRA_CHAVE_5 = palavrasChave['PALAVRA-CHAVE-5'] || "";
                    palavrasChaveObj.PALAVRA_CHAVE_6 = palavrasChave['PALAVRA-CHAVE-6'] || "";
                }
                
                
            }
        }

        // producao bibliográfica Livros e Capitulos
        if(cvData['PRODUCAO-BIBLIOGRAFICA'] && cvData['PRODUCAO-BIBLIOGRAFICA'][0]['LIVROS-E-CAPITULOS'][0]){
            
            if(cvData['PRODUCAO-BIBLIOGRAFICA'][0]['LIVROS-E-CAPITULOS'][0]['LIVROS-PUBLICADOS-OU-ORGANIZADOS']){
                const livros_publicados_ou_organizados = cvData['PRODUCAO-BIBLIOGRAFICA'][0]['LIVROS-E-CAPITULOS'][0]['LIVROS-PUBLICADOS-OU-ORGANIZADOS'][0]['LIVRO-PUBLICADO-OU-ORGANIZADO'] || []
                for (let livro of livros_publicados_ou_organizados) {
                    const dadosBasicos = livro['DADOS-BASICOS-DO-LIVRO'][0]['$'];
                    const detalhamento = livro['DETALHAMENTO-DO-LIVRO'][0]['$'];
    
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
                                NOME_COMPLETO_DO_AUTOR: autor['$']['NOME-COMPLETO-DO-AUTOR'] || "",
                                ORDEM_DE_AUTORIA: autor['$']['ORDEM-DE-AUTORIA'] || "",
                                ID_Lattes: autor['$']['NRO-ID-CNPQ'] || "",
                            });
                        }
                    }
    
                    // Preencher palavras-chave
                    if (livro['PALAVRAS-CHAVE'] && livro['PALAVRAS-CHAVE'][0]) {
                        const palavrasChave = livro['PALAVRAS-CHAVE'][0]['$'];
                        const palavrasChaveObj = curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].LIVROS_PUBLICADOS_OU_ORGANIZADOS.at(-1).PALAVRAS_CHAVE;
    
                        palavrasChaveObj.PALAVRA_CHAVE_1 = palavrasChave['PALAVRA-CHAVE-1'] || "";
                        palavrasChaveObj.PALAVRA_CHAVE_2 = palavrasChave['PALAVRA-CHAVE-2'] || "";
                        palavrasChaveObj.PALAVRA_CHAVE_3 = palavrasChave['PALAVRA-CHAVE-3'] || "";
                        palavrasChaveObj.PALAVRA_CHAVE_4 = palavrasChave['PALAVRA-CHAVE-4'] || "";
                        palavrasChaveObj.PALAVRA_CHAVE_5 = palavrasChave['PALAVRA-CHAVE-5'] || "";
                        palavrasChaveObj.PALAVRA_CHAVE_6 = palavrasChave['PALAVRA-CHAVE-6'] || "";
                    }
                }
    
            }
            
            
            
            if(cvData['PRODUCAO-BIBLIOGRAFICA'][0]['LIVROS-E-CAPITULOS'][0]['CAPITULOS-DE-LIVROS-PUBLICADOS']){
                    const capitulos_de_livros_publicados = cvData['PRODUCAO-BIBLIOGRAFICA'][0]['LIVROS-E-CAPITULOS'][0]['CAPITULOS-DE-LIVROS-PUBLICADOS'][0]['CAPITULO-DE-LIVRO-PUBLICADO'] || []
           
            
                    for (let capitulo of capitulos_de_livros_publicados) {
                        const dadosBasicos = capitulo['DADOS-BASICOS-DO-CAPITULO'][0]['$'];
                        const detalhamento = capitulo['DETALHAMENTO-DO-CAPITULO'][0]['$'];

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
                                    NOME_COMPLETO_DO_AUTOR: autor['$']['NOME-COMPLETO-DO-AUTOR'] || "",
                                    ORDEM_DE_AUTORIA: autor['$']['ORDEM-DE-AUTORIA'] || "",
                                    ID_Lattes: autor['$']['NRO-ID-CNPQ'] || "",
                                });
                            }
                        }

                        // Preencher palavras-chave
                        if (capitulo['PALAVRAS-CHAVE'] && capitulo['PALAVRAS-CHAVE'][0]) {
                            const palavrasChave = capitulo['PALAVRAS-CHAVE'][0]['$'];
                            const palavrasChaveObj = curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS[0].CAPITULO_DE_LIVROS_PUBLICADOS.at(-1).PALAVRAS_CHAVE;

                            palavrasChaveObj.PALAVRA_CHAVE_1 = palavrasChave['PALAVRA-CHAVE-1'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_2 = palavrasChave['PALAVRA-CHAVE-2'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_3 = palavrasChave['PALAVRA-CHAVE-3'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_4 = palavrasChave['PALAVRA-CHAVE-4'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_5 = palavrasChave['PALAVRA-CHAVE-5'] || "";
                            palavrasChaveObj.PALAVRA_CHAVE_6 = palavrasChave['PALAVRA-CHAVE-6'] || "";
                        }
                }
            }
            
            
        }    
            

        if(cvData['PRODUCAO-BIBLIOGRAFICA'] && cvData['PRODUCAO-BIBLIOGRAFICA'][0]['TRABALHOS-EM-EVENTOS']){
            const trabalhos_em_eventos = cvData['PRODUCAO-BIBLIOGRAFICA'][0]['TRABALHOS-EM-EVENTOS'][0]['TRABALHO-EM-EVENTOS']
            
            
            for(let trabalho of trabalhos_em_eventos){
                const dadosBasicos = trabalho['DADOS-BASICOS-DO-TRABALHO'][0]['$']
                const detalhamento = trabalho['DETALHAMENTO-DO-TRABALHO'][0]['$']

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
                            NOME_COMPLETO_DO_AUTOR: autor['$']['NOME-COMPLETO-DO-AUTOR'] || "",
                            ORDEM_DE_AUTORIA: autor['$']['ORDEM-DE-AUTORIA'] || "",
                            ID_Lattes: autor['$']['NRO-ID-CNPQ'] || "",
                        });
                    }
                }
                if (trabalho['PALAVRAS-CHAVE'] && trabalho['PALAVRAS-CHAVE'][0]) {
                    const palavrasChave = trabalho['PALAVRAS-CHAVE'][0]['$'];
                    const palavrasChaveObj = curriculo.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.TRABALHOS_EM_EVENTOS.at(-1).PALAVRAS_CHAVE;
                
                    palavrasChaveObj.PALAVRA_CHAVE_1 = palavrasChave['PALAVRA-CHAVE-1'] || "";
                    palavrasChaveObj.PALAVRA_CHAVE_2 = palavrasChave['PALAVRA-CHAVE-2'] || "";
                    palavrasChaveObj.PALAVRA_CHAVE_3 = palavrasChave['PALAVRA-CHAVE-3'] || "";
                    palavrasChaveObj.PALAVRA_CHAVE_4 = palavrasChave['PALAVRA-CHAVE-4'] || "";
                    palavrasChaveObj.PALAVRA_CHAVE_5 = palavrasChave['PALAVRA-CHAVE-5'] || "";
                    palavrasChaveObj.PALAVRA_CHAVE_6 = palavrasChave['PALAVRA-CHAVE-6'] || "";
                }
                


            }
            
        }

      
     
        if (cvData['OUTRA-PRODUCAO'] && cvData['OUTRA-PRODUCAO'][0]['ORIENTACOES-CONCLUIDAS']) {
            console.log('ENTROU NO IF OUTRAS PRODUCOES')
            const orientacoes = cvData['OUTRA-PRODUCAO'][0]['ORIENTACOES-CONCLUIDAS'] || [];
            
            const orientacoes_mestrado = orientacoes[0]['ORIENTACOES-CONCLUIDAS-PARA-MESTRADO'] || [];
            const orientacoes_doutorado = orientacoes[0]['ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO'] || [];
            const orientacoes_pos_doutorado = orientacoes[0]['ORIENTACOES-CONCLUIDAS-PARA-POS-DOUTORADO'] || [];
            for (let orientacao of orientacoes_mestrado) {
                
                const dadosBasicos = orientacao['DADOS-BASICOS-DE-ORIENTACOES-CONCLUIDAS-PARA-MESTRADO'][0]['$'];
                const detalhamento = orientacao['DETALHAMENTO-DE-ORIENTACOES-CONCLUIDAS-PARA-MESTRADO'][0]['$'];
                curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_MESTRADO.push({
                    NOME_DO_ORIENTADO: detalhamento['NOME-DO-ORIENTADO'] || "",
                    TITULO: dadosBasicos['TITULO'] || "",
                    ANO: dadosBasicos['ANO'] || "",
                    NOME_DA_INSTITUICAO: detalhamento['NOME-DA-INSTITUICAO'] || "",
                    NOME_DO_CURSO: detalhamento['NOME-DO-CURSO'] || "",
                    TIPO: dadosBasicos['TIPO'] || "",
                    TIPO_DE_ORIENTACAO: detalhamento['TIPO-DE-ORIENTACAO'] || "",
                });

            }
            for (let orientacao of orientacoes_doutorado) {
                const dadosBasicos = orientacao['DADOS-BASICOS-DE-ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO'][0]['$'];
                const detalhamento = orientacao['DETALHAMENTO-DE-ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO'][0]['$'];
                curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_DOUTORADO.push({
                    NOME_DO_ORIENTADO: detalhamento['NOME-DO-ORIENTADO'] || "",
                    TITULO: dadosBasicos['TITULO'] || "",
                    ANO: dadosBasicos['ANO'] || "",
                    NOME_DA_INSTITUICAO: detalhamento['NOME-DA-INSTITUICAO'] || "",
                    NOME_DO_CURSO: detalhamento['NOME-DO-CURSO'] || "",
                    TIPO: dadosBasicos['TIPO'] || "",
                    TIPO_DE_ORIENTACAO: detalhamento['TIPO-DE-ORIENTACAO'] || "",
                });
            }
            for (let orientacao of orientacoes_pos_doutorado) {
                const dadosBasicos = orientacao['DADOS-BASICOS-DE-ORIENTACOES-CONCLUIDAS-PARA-POS-DOUTORADO'][0]['$'];
                const detalhamento = orientacao['DETALHAMENTO-DE-ORIENTACOES-CONCLUIDAS-PARA-POS-DOUTORADO'][0]['$'];
                curriculo.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_POS_DOUTORADO.push({
                    NOME_DO_ORIENTADO: detalhamento['NOME-DO-ORIENTADO'] || "",
                    TITULO: dadosBasicos['TITULO'] || "",
                    ANO: dadosBasicos['ANO'] || "",
                    NOME_DA_INSTITUICAO: detalhamento['NOME-DA-INSTITUICAO'] || "",
                    NOME_DO_CURSO: detalhamento['NOME-DO-CURSO'] || "",
                    TIPO: dadosBasicos['TIPO'] || "",
                    TIPO_DE_ORIENTACAO: detalhamento['TIPO-DE-ORIENTACAO'] || "",
                });
            }
            
            
        }
        if (cvData['DADOS-COMPLEMENTARES'] && cvData['DADOS-COMPLEMENTARES'][0]['ORIENTACOES-EM-ANDAMENTO']) {
            const orientacoes = cvData['DADOS-COMPLEMENTARES'][0]['ORIENTACOES-EM-ANDAMENTO'] || [];
            
            const orientacoes_mestrado = orientacoes[0]['ORIENTACAO-EM-ANDAMENTO-DE-MESTRADO'] || [];
            const orientacoes_doutorado = orientacoes[0]['ORIENTACAO-EM-ANDAMENTO-DE-DOUTORADO'] || [];
            const orientacoes_pos_doutorado = orientacoes[0]['ORIENTACAO-EM-ANDAMENTO-DE-POS-DOUTORADO'] || [];
            for (let orientacao of orientacoes_mestrado) {
                
                const dadosBasicos = orientacao['DADOS-BASICOS-DA-ORIENTACAO-EM-ANDAMENTO-DE-MESTRADO'][0]['$'];
                const detalhamento = orientacao['DETALHAMENTO-DA-ORIENTACAO-EM-ANDAMENTO-DE-MESTRADO'][0]['$'];
                curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_MESTRADO.push({
                    NOME_DO_ORIENTADO: detalhamento['NOME-DO-ORIENTADO'] || "",
                    TITULO: dadosBasicos['TITULO-DO-TRABALHO'] || "",
                    ANO: dadosBasicos['ANO'] || "",
                    NOME_DA_INSTITUICAO: detalhamento['NOME-DA-INSTITUICAO'] || "",
                    NOME_DO_CURSO: detalhamento['NOME-DO-CURSO'] || "",
                    TIPO: dadosBasicos['TIPO'] || "",
                    TIPO_DE_ORIENTACAO: detalhamento['TIPO-DE-ORIENTACAO'] || "",
                });

            }
            for (let orientacao of orientacoes_doutorado) {
                const dadosBasicos = orientacao['DADOS-BASICOS-DA-ORIENTACAO-EM-ANDAMENTO-DE-DOUTORADO'][0]['$'];
                const detalhamento = orientacao['DETALHAMENTO-DA-ORIENTACAO-EM-ANDAMENTO-DE-DOUTORADO'][0]['$'];
                curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_DOUTORADO.push({
                    NOME_DO_ORIENTADO: detalhamento['NOME-DO-ORIENTADO'] || "",
                    TITULO: dadosBasicos['TITULO-DO-TRABALHO'] || "",
                    ANO: dadosBasicos['ANO'] || "",
                    NOME_DA_INSTITUICAO: detalhamento['NOME-DA-INSTITUICAO'] || "",
                    NOME_DO_CURSO: detalhamento['NOME-DO-CURSO'] || "",
                    TIPO: dadosBasicos['TIPO'] || "",
                    TIPO_DE_ORIENTACAO: detalhamento['TIPO-DE-ORIENTACAO'] || "",
                });

            }
            for (let orientacao of orientacoes_pos_doutorado) {
                const dadosBasicos = orientacao['DADOS-BASICOS-DA-ORIENTACAO-EM-ANDAMENTO-DE-POS-DOUTORADO'][0]['$'];
                const detalhamento = orientacao['DETALHAMENTO-DA-ORIENTACAO-EM-ANDAMENTO-DE-POS-DOUTORADO'][0]['$'];
                curriculo.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_POS_DOUTORADO.push({
                    NOME_DO_ORIENTADO: detalhamento['NOME-DO-ORIENTADO'] || "",
                    TITULO: dadosBasicos['TITULO-DO-TRABALHO'] || "",
                    ANO: dadosBasicos['ANO'] || "",
                    NOME_DA_INSTITUICAO: detalhamento['NOME-DA-INSTITUICAO'] || "",
                    NOME_DO_CURSO: detalhamento['NOME-DO-CURSO'] || "",
                    TIPO: dadosBasicos['TIPO'] || "",
                    TIPO_DE_ORIENTACAO: detalhamento['TIPO-DE-ORIENTACAO'] || "",
                });

            }
        }
        
        if(cvData['PRODUCAO-TECNICA'] && cvData['PRODUCAO-TECNICA'][0]['SOFTWARE']){
            const softwares = cvData['PRODUCAO-TECNICA'][0]['SOFTWARE'] || []
            for(let software of softwares){
                const dadosBasicos = software['DADOS-BASICOS-DO-SOFTWARE'][0]['$']
                const detalhamento = software['DETALHAMENTO-DO-SOFTWARE'][0]['$']
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
                            NOME_COMPLETO_DO_AUTOR: autor['$']['NOME-COMPLETO-DO-AUTOR'] || "",
                            ORDEM_DE_AUTORIA: autor['$']['ORDEM-DE-AUTORIA'] || "",
                            ID_Lattes: autor['$']['NRO-ID-CNPQ'] || "",
                        });
                    }
                }

            }}
            if(cvData['PRODUCAO-TECNICA'] && cvData['PRODUCAO-TECNICA'][0]['PATENTE']){
                const patentes = cvData['PRODUCAO-TECNICA'][0]['PATENTE'] || []
                for(let patente of patentes){
                    const dadosBasicos = patente['DADOS-BASICOS-DA-PATENTE'][0]['$']
                    const detalhamento = patente['DETALHAMENTO-DA-PATENTE'][0]['$']
                    const registro_ou_patente = patente['DETALHAMENTO-DA-PATENTE'][0]['REGISTRO-OU-PATENTE'][0]['$'] || []
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
                                NOME_COMPLETO_DO_AUTOR: autor['$']['NOME-COMPLETO-DO-AUTOR'] || "",
                                ORDEM_DE_AUTORIA: autor['$']['ORDEM-DE-AUTORIA'] || "",
                                ID_Lattes: autor['$']['NRO-ID-CNPQ'] || "",
                            });
                        }
                    }

                }}

            



 
        lattesSimplificado.push(curriculo);

        




        //console.log(result['CURRICULO-VITAE']['DADOS-GERAIS'][0]['$']['NOME-COMPLETO']);
        //console.log('-------------------------------------------------------------------------------------------')

        //console.log(result['CURRICULO-VITAE']['PRODUCAO-BIBLIOGRAFICA'][0]['ARTIGOS-PUBLICADOS'][0]['ARTIGO-PUBLICADO'][0]['DADOS-BASICOS-DO-ARTIGO'][0]['$']['TITULO-DO-ARTIGO']);
        //console.log('-------------------------------------------------------------------------------------------')
        //console.log(result['CURRICULO-VITAE']['PRODUCAO-BIBLIOGRAFICA'][0]['ARTIGOS-PUBLICADOS'][0]['ARTIGO-PUBLICADO'][0]['DADOS-BASICOS-DO-ARTIGO'][0]['$']['ANO-DO-ARTIGO']);
        //console.log('-------------------------------------------------------------------------------------------\n')
    }
    try{
        const delete_last = await lattesdb.deleteMany({});
        if(delete_last){
            console.log('Deletado com sucesso');
            const resultado_banco = await lattesdb.insertMany(lattesSimplificado);
            if(resultado_banco){
                console.log('Cadastrado com sucesso');
            }
        }
        
    }catch(err){
        console.log('Erro ao cadastrar no banco de dados', err);
    }
    
    res.json({lattesSimplificado, lattes});
    
};



const getLattesbyId = async(req, res)=>{
    const id_lattes = req.params.id
    console.log(id_lattes);
    
    try{
        const resultQuery = await lattesdb.find({ "CURRICULO_VITAE.ID_Lattes": id_lattes })
       console.log(resultQuery[0]);
        
        res.status(200).json({lattes:resultQuery[0]}) 
    }catch(err){
        res.status(500).json({ error: 'Internal server error'})
    }
}

module.exports = {
    getLattes, getLattesbyId
};



