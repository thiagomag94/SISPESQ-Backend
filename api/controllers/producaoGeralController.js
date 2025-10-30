const { Datapesqdb, Researcherdb} = require('../db');
const {lattesdb} = require('../models/Lattes');
const mongoose = require('mongoose');

// Funções auxiliares para cálculo de datas
const calcularDataFim = (situacaoFuncional, dataExclusao) => {
    if (situacaoFuncional === 'APOSENTADO') {
        if (dataExclusao) {
            const dataFim = new Date(dataExclusao);
            dataFim.setFullYear(dataFim.getFullYear() + 10);
            return dataFim;
        }
        return new Date();
    }
    return dataExclusao || new Date();
};

const calcularPeriodoAtividade = (researcher) => {
    return {
        inicio: researcher.DATA_INGRESSO_UFPE || new Date(0),
        fim: calcularDataFim(researcher.SITUACAO_FUNCIONAL, researcher.DATA_EXCLUSAO)
    };
};


//Todos os dados de produção vão ser filtrados pelo periodo de atividade do pesquisador
const ProducaoGeralcreate = async (req, res) => {
    try {
        // Get the collection and clear existing data before any processing
        const producaoGeralCollection = mongoose.connection.collection('producao_geral');
        console.log('Limpando collection producao_geral...');
        await producaoGeralCollection.deleteMany({});

        // Pipeline de agregação para processar os dados
        const pipeline = [
            // Primeiro, fazemos um lookup para juntar os dados do Lattes
            {
                $lookup: {
                    from: 'lattes',
                    localField: 'ID_Lattes',
                    foreignField: 'CURRICULO_VITAE.ID_Lattes',
                    as: 'lattesData'
                }
            },
            // Desestruturamos o array do lookup
            {
                $unwind: {
                    path: '$lattesData',
                    preserveNullAndEmptyArrays: true
                }
            },
            // Filtramos registros inválidos
            {
                $match: {
                    ID_Lattes: { $exists: true, $ne: null },
                    PESQUISADOR: { $exists: true, $ne: null }
                }
            },
            // Calculamos o período de atividade
           {$addFields: {
                    periodo_atividade: {
                        inicio: {
                            // Normaliza a data de ingresso para 31/12 do ano de ingresso, se quiser
                            $ifNull: ['$DATA_INGRESSO_UFPE', new Date(0)]
                        },
                        fim: {
                            $let: {
                                vars: {
                                    fimBase: {
                                        $cond: {
                                            if: { $eq: ['$SITUACAO_FUNCIONAL', 'APOSENTADO'] },
                                            then: { $dateAdd: { startDate: '$DATA_EXCLUSAO_UFPE', unit: 'year', amount: 10 } },
                                            else: { $ifNull: ['$DATA_EXCLUSAO_UFPE', new Date()] }
                                        }
                                    }
                                },
                                in: {
                                    $dateFromParts: {
                                        year: { $year: '$$fimBase' },
                                        month: 12,
                                        day: 31
                                    }
                                }
                            }
                        }
                    }
                },
           },

            // Calculamos as contagens e coletamos as produções
            {
                $addFields: {
                    contagem: {
                        artigos: {
                            $size: {
                                $filter: {
                                    input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.ARTIGOS_PUBLICADOS', []] },
                                    as: 'artigo',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$artigo.ANO_DO_ARTIGO', '$periodo_atividade.inicio' ] },
                                            { $lte: ['$$artigo.ANO_DO_ARTIGO', '$periodo_atividade.fim' ] }
                                        ]
                                    }
                                }
                            }
                        },
                        livros: {
                            $size: {
                                $filter: {
                                    input: { 
                                        $ifNull: [
                                            { $getField: {
                                                field: "LIVROS_PUBLICADOS_OU_ORGANIZADOS",
                                                input: { $arrayElemAt: ['$lattesData.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS', 0] }
                                            }},
                                            []
                                        ]
                                    },
                                    as: 'livro',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$livro.ANO', '$periodo_atividade.inicio' ] },
                                            { $lte: ['$$livro.ANO', '$periodo_atividade.fim' ] }
                                        ]
                                    }
                                }
                            }
                        },
                        capitulos: {
                            $size: {
                                $filter: {
                                    input: { 
                                        $ifNull: [
                                            { $getField: {
                                                field: "CAPITULO_DE_LIVROS_PUBLICADOS",
                                                input: { $arrayElemAt: ['$lattesData.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS', 0] }
                                            }},
                                            []
                                        ]
                                    },
                                    as: 'capitulo',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$capitulo.ANO', '$periodo_atividade.inicio' ] },
                                            { $lte: ['$$capitulo.ANO', '$periodo_atividade.fim' ] }
                                        ]
                                    }
                                }
                            }
                        },
                        trabalhos_eventos: {
                            $size: {
                                $filter: {
                                    input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.TRABALHOS_EM_EVENTOS', []] },
                                    as: 'trabalho',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$trabalho.ANO_DO_TRABALHO', '$periodo_atividade.inicio' ] },
                                            { $lte: ['$$trabalho.ANO_DO_TRABALHO', '$periodo_atividade.fim' ] }
                                        ]
                                    }
                                }
                            }
                        },
                        textos_jornais: {
                            $size: {
                                $filter: {
                                    input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.TEXTO_EM_JORNAL_OU_REVISTA', []] },
                                    as: 'texto',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$texto.ANO_DO_TEXTO', '$periodo_atividade.inicio' ] },
                                            { $lte: ['$$texto.ANO_DO_TEXTO', '$periodo_atividade.fim' ] }
                                        ]
                                    }
                                }
                            }
                        },
                        outras_producoes_bibliograficas: {
                            $size: {
                                $filter: {
                                    input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.OUTRAS_PRODUCOES_BIBLIOGRAFICAS', []] },
                                    as: 'outras_producoes_bibliograficas',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$outras_producoes_bibliograficas.ANO', '$periodo_atividade.inicio' ] },
                                            { $lte: ['$$outras_producoes_bibliograficas.ANO', '$periodo_atividade.fim' ] }
                                        ]
                                    }
                                }
                            }
                        },

                        partituras_musicais:{
                            $size: {
                                $filter: {
                                    input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.PARTITURAS_MUSICAIS', []] },
                                    as: 'partitura',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$partitura.ANO', '$periodo_atividade.inicio' ] },
                                            { $lte: ['$$partitura.ANO', '$periodo_atividade.fim' ] }
                                        ]
                                    }
                                }
                            }
                        },
                     
                        softwares: {
                            $size: {
                                $filter: {
                                    input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_TECNICA.SOFTWARE', []] },
                                    as: 'software',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$software.ANO', '$periodo_atividade.inicio' ] },
                                            { $lte: ['$$software.ANO', '$periodo_atividade.fim' ] }
                                        ]
                                    }
                                }
                            }
                        },
                        patentes: {
                            $size: {
                                $filter: {
                                    input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE', []] },
                                    as: 'patente',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$patente.DATA_DE_DEPOSITO', '$periodo_atividade.inicio' ] },
                                            { $lte: ['$$patente.DATA_DE_DEPOSITO', '$periodo_atividade.fim' ] }
                                        ]
                                    }
                                }
                            }
                        },
                        producao_artistica_cultural:{
                            artes_cenicas: {
                                $size: {
                                    $filter: {
                                        input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.ARTES_CENICAS', []] },
                                        as: 'artes_cenicas',
                                        cond: {
                                            $and: [
                                                { $gte: ['$$artes_cenicas.ANO', '$periodo_atividade.inicio' ] },
                                                { $lte: ['$$artes_cenicas.ANO', '$periodo_atividade.fim' ] }
                                            ]
                                        }
                                    }
                                }
                            },
                            musicas:{
                                $size: {
                                    $filter: {
                                        input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.MUSICA', []] },
                                        as: 'musica',
                                        cond: {
                                            $and: [
                                                { $gte: ['$$musica.ANO', '$periodo_atividade.inicio' ] },
                                                { $lte: ['$$musica.ANO', '$periodo_atividade.fim' ] }
                                            ]
                                        }
                                    }
                                }
                            }
                        },
                        orientacoes_concluidas: {
                            doutorado: {
                                $size: {
                                    $filter: {
                                        input: { $ifNull: ['$lattesData.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_DOUTORADO', []] },
                                        as: 'orientacao',
                                        cond: {
                                            $and: [
                                                { $gte: ['$$orientacao.ANO', '$periodo_atividade.inicio' ] },
                                                { $lte: ['$$orientacao.ANO', '$periodo_atividade.fim' ] }
                                            ]
                                        }
                                    }
                                }
                            },
                            mestrado: {
                                $size: {
                                    $filter: {
                                        input: { $ifNull: ['$lattesData.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_MESTRADO', []] },
                                        as: 'orientacao',
                                        cond: {
                                            $and: [
                                                { $gte: ['$$orientacao.ANO', '$periodo_atividade.inicio' ] },
                                                { $lte: ['$$orientacao.ANO', '$periodo_atividade.fim' ] }
                                            ]
                                        }
                                    }
                                }
                            },
                            pos_doutorado: {
                                $size: {
                                    $filter: {
                                        input: { $ifNull: ['$lattesData.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_POS_DOUTORADO', []] },
                                        as: 'orientacao',
                                        cond: {
                                            $and: [
                                                { $gte: ['$$orientacao.ANO', '$periodo_atividade.inicio' ] },
                                                { $lte: ['$$orientacao.ANO', '$periodo_atividade.fim' ] }
                                            ]
                                        }
                                    }
                                }
                            }
                        },
                        orientacoes_andamento: {
                            doutorado: {
                                $size: {
                                    $filter: {
                                        input: { $ifNull: ['$lattesData.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_DOUTORADO', []] },
                                        as: 'orientacao',
                                        cond: {
                                            $and: [
                                                { $gte: ['$$orientacao.ANO', '$periodo_atividade.inicio' ] },
                                                { $lte: ['$$orientacao.ANO', '$periodo_atividade.fim' ] }
                                            ]
                                        }
                                    }
                                }
                            },
                            mestrado: {
                                $size: {
                                    $filter: {
                                        input: { $ifNull: ['$lattesData.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_MESTRADO', []] },
                                        as: 'orientacao',
                                        cond: {
                                            $and: [
                                                { $gte: ['$$orientacao.ANO', '$periodo_atividade.inicio' ] },
                                                { $lte: ['$$orientacao.ANO', '$periodo_atividade.fim' ] }
                                            ]
                                        }
                                    }
                                }
                            },
                            pos_doutorado: {
                                $size: {
                                    $filter: {
                                        input: { $ifNull: ['$lattesData.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_POS_DOUTORADO', []] },
                                        as: 'orientacao',
                                        cond: {
                                            $and: [
                                                { $gte: ['$$orientacao.ANO', '$periodo_atividade.inicio' ] },
                                                { $lte: ['$$orientacao.ANO', '$periodo_atividade.fim' ] }
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    },
                    producoes: {
                        artigos: {
                            $filter: {
                                input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.ARTIGOS_PUBLICADOS', []] },
                                as: 'artigo',
                                cond: {
                                    $and: [
                                        { $gte: ['$$artigo.ANO_DO_ARTIGO', '$periodo_atividade.inicio' ] },
                                        { $lte: ['$$artigo.ANO_DO_ARTIGO', '$periodo_atividade.fim' ] }
                                    ]
                                }
                            }
                        },
                        livros: {
                            $filter: {
                                input: { 
                                    $ifNull: [
                                        { $getField: {
                                            field: "LIVROS_PUBLICADOS_OU_ORGANIZADOS",
                                            input: { $arrayElemAt: ['$lattesData.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS', 0] }
                                        }},
                                        []
                                    ]
                                },
                                as: 'livro',
                                cond: {
                                    $and: [
                                        { $gte: ['$$livro.ANO', '$periodo_atividade.inicio' ] },
                                        { $lte: ['$$livro.ANO', '$periodo_atividade.fim' ] }
                                    ]
                                }
                            }
                        },
                        capitulos: {
                            $filter: {
                                input: { 
                                    $ifNull: [
                                        { $getField: {
                                            field: "CAPITULO_DE_LIVROS_PUBLICADOS",
                                            input: { $arrayElemAt: ['$lattesData.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS', 0] }
                                        }},
                                        []
                                    ]
                                },
                                as: 'capitulo',
                                cond: {
                                    $and: [
                                        { $gte: ['$$capitulo.ANO', '$periodo_atividade.inicio' ] },
                                        { $lte: ['$$capitulo.ANO', '$periodo_atividade.fim' ] }
                                    ]
                                }
                            }
                        },
                        trabalhos_eventos: {
                            $filter: {
                                input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.TRABALHOS_EM_EVENTOS', []] },
                                as: 'trabalho',
                                cond: {
                                    $and: [
                                        { $gte: ['$$trabalho.ANO_DO_TRABALHO', '$periodo_atividade.inicio' ] },
                                        { $lte: ['$$trabalho.ANO_DO_TRABALHO', '$periodo_atividade.fim' ] }
                                    ]
                                }
                            }
                        },
                        textos_jornais: {
                            $filter: {
                                input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.TEXTO_EM_JORNAL_OU_REVISTA', []] },
                                as: 'texto',
                                cond: {
                                    $and: [
                                        { $gte: ['$$texto.ANO_DO_TEXTO', '$periodo_atividade.inicio' ] },
                                        { $lte: ['$$texto.ANO_DO_TEXTO', '$periodo_atividade.fim' ] }
                                    ]
                                }
                            }
                        },
                        outras_producoes_bibliograficas: {
                            $filter: {
                                input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.OUTRAS_PRODUCOES_BIBLIOGRAFICAS', []] },
                                as: 'outras_producoes_bibliograficas', 
                                cond: {
                                    $and: [
                                        { $gte: ['$$outras_producoes_bibliograficas.ANO', '$periodo_atividade.inicio' ] },
                                        { $lte: ['$$outras_producoes_bibliograficas.ANO', '$periodo_atividade.fim' ] }
                                    ]
                                }
                            }
                        },
                        partituras_musicais:{
                            $filter: {
                                input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.PARTITURAS_MUSICAIS', []] },
                                as: 'partitura',
                                cond: {
                                    $and: [
                                        { $gte: ['$$partitura.ANO', '$periodo_atividade.inicio' ] },
                                        { $lte: ['$$partitura.ANO', '$periodo_atividade.fim' ] }
                                    ]
                                }
                            }
                        },
                        softwares: {
                            $filter: {
                                input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_TECNICA.SOFTWARE', []] },
                                as: 'software',
                                cond: {
                                    $and: [
                                        { $gte: ['$$software.ANO', '$periodo_atividade.inicio' ] },
                                        { $lte: ['$$software.ANO', '$periodo_atividade.fim' ] }
                                    ]
                                }
                            }
                        },
                        patentes: {
                            $filter: {
                                input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE', []] },
                                as: 'patente',
                                cond: {
                                    $and: [
                                        { $gte: ['$$patente.DATA_DE_DEPOSITO', '$periodo_atividade.inicio' ] },
                                        { $lte: ['$$patente.DATA_DE_DEPOSITO', '$periodo_atividade.fim' ] }
                                    ]
                                }
                            }
                        },
                        producao_artistica_cultural:{
                            artes_cenicas: {
                                $filter: {
                                    input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.ARTES_CENICAS', []] },
                                    as: 'artes_cenicas',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$artes_cenicas.ANO', '$periodo_atividade.inicio' ] },
                                            { $lte: ['$$artes_cenicas.ANO', '$periodo_atividade.fim' ] }
                                        ]
                                    }
                                }
                            },
                            musicas:{
                                $filter: {
                                    input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_ARTISTICA_CULTURAL.MUSICA', []] },
                                    as: 'musica',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$musica.ANO', '$periodo_atividade.inicio' ] },
                                            { $lte: ['$$musica.ANO', '$periodo_atividade.fim' ] }
                                        ]
                                    }
                                }
                            }
                        },
                        orientacoes_concluidas: {
                            doutorado: {
                                $filter: {
                                    input: { $ifNull: ['$lattesData.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_DOUTORADO', []] },
                                    as: 'orientacao',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$orientacao.ANO', '$periodo_atividade.inicio' ] },
                                            { $lte: ['$$orientacao.ANO', '$periodo_atividade.fim' ] }
                                        ]
                                    }
                                }
                            },
                            mestrado: {
                                $filter: {
                                    input: { $ifNull: ['$lattesData.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_MESTRADO', []] },
                                    as: 'orientacao',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$orientacao.ANO', '$periodo_atividade.inicio' ] },
                                            { $lte: ['$$orientacao.ANO', '$periodo_atividade.fim' ] }
                                        ]
                                    }
                                }
                            },
                            pos_doutorado: {
                                $filter: {
                                    input: { $ifNull: ['$lattesData.CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_POS_DOUTORADO', []] },
                                    as: 'orientacao',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$orientacao.ANO', '$periodo_atividade.inicio' ] },
                                            { $lte: ['$$orientacao.ANO', '$periodo_atividade.fim' ] }
                                        ]
                                    }
                                }
                            }
                        },
                        orientacoes_andamento: {
                            doutorado: {
                                $filter: {
                                    input: { $ifNull: ['$lattesData.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_DOUTORADO', []] },
                                    as: 'orientacao',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$orientacao.ANO', '$periodo_atividade.inicio' ] },
                                            { $lte: ['$$orientacao.ANO', '$periodo_atividade.fim' ] }
                                        ]
                                    }
                                }
                            },
                            mestrado: {
                                $filter: {
                                    input: { $ifNull: ['$lattesData.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_MESTRADO', []] },
                                    as: 'orientacao',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$orientacao.ANO', '$periodo_atividade.inicio' ] },
                                            { $lte: ['$$orientacao.ANO', '$periodo_atividade.fim' ] }
                                        ]
                                    }
                                }
                            },
                            pos_doutorado: {
                                $filter: {
                                    input: { $ifNull: ['$lattesData.CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_POS_DOUTORADO', []] },
                                    as: 'orientacao',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$orientacao.ANO', '$periodo_atividade.inicio' ] },
                                            { $lte: ['$$orientacao.ANO', '$periodo_atividade.fim' ] }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            },
            // Removemos campos desnecessários e geramos um novo _id
            {
                $project: {
                    _id: {
                        $concat: [
                            { $toString: { $ifNull: ['$ID_Lattes', ''] } },
                            '_',
                            { $toString: { $ifNull: [{ $dateToString: { format: '%Y%m%d', date: '$DATA_INGRESSO_UFPE' } }, '0'] } }
                        ]
                    },
                    id_lattes: '$ID_Lattes',
                    nome: '$PESQUISADOR',
                    departamento: '$UORG_LOTACAO',
                    centro: '$SIGLA_CENTRO',
                    situacao_funcional: '$SITUACAO_FUNCIONAL',
                    periodo_atividade: 1,
                    contagem: 1,
                    producoes: 1
                }
            },
            // Filtramos documentos com _id nulo
            {
                $match: {
                    _id: { $ne: null }
                }
            },
            // Salvamos na nova collection usando $merge
            {
                $merge: {
                    into: 'producao_geral',
                    on: '_id',
                    whenMatched: 'replace',
                    whenNotMatched: 'insert'
                }
            }
        ];

        console.log('Iniciando processamento com agregação...');
        await Researcherdb.aggregate(pipeline);
        console.log('Processamento concluído com sucesso!');

        res.status(200).json({
            success: true,
            message: 'Produção geral processada com sucesso'
        });

    } catch (error) {
        console.error('Erro ao processar produção geral:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar produção geral',
            error: error.message
        });
    }
};

const getProducaoGeral = async (req, res) => {
    try {
        const { centro, departamento, situacao_funcional, regime_de_trabalho, id_lattes, groupBy, anoartigo_gte, anoartigo_lte, anoartigo_eq} = req.query;
        console.log('Consultando produção geral com filtros:', { centro, departamento, situacao_funcional, groupBy });
        // Acessar a collection criada pelo $out
        const producaoGeralCollection = mongoose.connection.collection('producao_geral');
        
        // Construir pipeline de agregação
        const pipeline = [];

        // Adicionar filtros ao pipeline
        const matchStage = {};
        if (centro) matchStage.centro = centro;
        if (departamento) matchStage.departamento = departamento;
        if (situacao_funcional) matchStage.situacao_funcional = situacao_funcional;
        if (id_lattes) matchStage.id_lattes = id_lattes;
        if (regime_de_trabalho) matchStage.regime_de_trabalho = regime_de_trabalho;
      

        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }

        // --- ETAPA 2: NOVOS FILTROS QUANTITATIVOS ---
      
        // Precisamos filtrar *dentro* do array 'producoes.artigos'
        
        if (anoartigo_gte || anoartigo_lte || anoartigo_eq) {
            
            const filtroAno = {};
            
            // Assumindo que o campo de ano dentro do array é um objeto Date
            // Se for um número (ex: 2020), troque 'new Date()' por 'parseInt()'
            if (anoartigo_gte) {
                // Se o campo for data (ex: "2020-01-01"), use new Date()
                filtroAno.$gte = new Date(anoartigo_gte); 
            }
            if (anoartigo_lte) {
                filtroAno.$lte = new Date(anoartigo_lte);
            }

            if (anoartigo_eq) {
                filtroAno.$eq = new Date(anoartigo_eq);
            }

            // 1. Filtra o array 'producoes.artigos'
            pipeline.push({
                $addFields: {
                    "producoes.artigos": { // Reescreve o array 'producoes.artigos'
                        $filter: {
                            input: { $ifNull: ["$producoes.artigos", []] }, // Pega o array (ou um array vazio se for nulo)
                            as: "artigo",
                            cond: { 
                                $and: [
                                    // !!! ATENÇÃO: Confirme o nome do campo de ano aqui !!!
                                    // (Ex: $$artigo.ANO_DO_ARTIGO, $$artigo.ano, etc.)
                                    { $gte: [ "$$artigo.ANO_DO_ARTIGO", filtroAno.$gte || new Date("1000-01-01") ] },
                                    { $lte: [ "$$artigo.ANO_DO_ARTIGO", filtroAno.$lte || new Date("9999-12-31") ] },
                                    ...(filtroAno.$eq ? [ { $eq: [ "$$artigo.ANO_DO_ARTIGO", filtroAno.$eq ] } ] : [] )
                                ]
                            }
                        }
                    }
                    // (Você pode replicar este bloco para 'producoes.livros' se tiver 'anolivro_gte', etc.)
                }
            });

            // 2. Recalcula a 'contagem.artigos' para bater com o array que acabamos de filtrar
            pipeline.push({
                $addFields: {
                    "contagem.artigos": { $size: { $ifNull: ["$producoes.artigos", []] } }
                    // (Recalcule 'contagem.livros' se você o filtrou também)
                }
            });

    
            // 3. Remove pesquisadores que ficaram com 0 artigos APÓS o filtro de ano
            pipeline.push({
                $match: { "contagem.artigos": { $gt: 0 } }
            });
         
        }
        
        // Mapeia os nomes das queries para os campos no banco
        // (Necessário para o caso "sem groupBy", onde os campos são aninhados)
        const fieldMap = {
            'data_ingresso_ufpe': 'periodo_atividade.inicio',
            'data_exclusao_ufpe': 'periodo_atividade.fim',
            'artigos': 'contagem.artigos',
            'livros': 'contagem.livros',
            'capitulos': 'contagem.capitulos',
            'trabalhos_eventos': 'contagem.trabalhos_eventos',
            'textos_jornais': 'contagem.textos_jornais',
            'outras_producoes_bibliograficas': 'contagem.outras_producoes_bibliograficas',
            'partituras_musicais': 'contagem.partituras_musicais',
            'musicas': 'contagem.producao_artistica_cultural.musicas',
            'artes_cenicas': 'contagem.producao_artistica_cultural.artes_cenicas',
            'softwares': 'contagem.softwares',
            'patentes': 'contagem.patentes',
            'orientacoes_concluidas_doutorado': 'contagem.orientacoes_concluidas.doutorado',
            'orientacoes_concluidas_mestrado': 'contagem.orientacoes_concluidas.mestrado',
            'orientacoes_concluidas_pos_doutorado': 'contagem.orientacoes_concluidas.pos_doutorado',
            'orientacoes_andamento_doutorado': 'contagem.orientacoes_andamento.doutorado',
            'orientacoes_andamento_mestrado': 'contagem.orientacoes_andamento.mestrado',
            'orientacoes_andamento_pos_doutorado': 'contagem.orientacoes_andamento.pos_doutorado',
            // Campos que SÓ existem no groupBy
            'total_pesquisadores': 'total_pesquisadores',
            'total_producao_bibliografica': 'total_producao_bibliografica',
            'total_producao_tecnica': 'total_producao_tecnica',
            'total_producao_artistica_cultural': 'total_producao_artistica_cultural',
            'total_orientacoes_concluidas': 'total_orientacoes_concluidas',
            'total_orientacoes_andamento': 'total_orientacoes_andamento',
            'total_orientacoes': 'total_orientacoes',
        };

        const quantitativeMatchStage = {};
        
        for (const key in req.query) {
            // Coloque esta lógica ANTES de tentar "splitar" a chave
            if (key === "data_ingresso_ufpe_isnull") {
                if (!quantitativeMatchStage['periodo_atividade.inicio']) {
                     quantitativeMatchStage['periodo_atividade.inicio'] = {};
                }
        quantitativeMatchStage['periodo_atividade.inicio']['$eq'] = null;
        continue; // Pula para a próxima chave
    }
    if (key === "data_ingresso_ufpe_notnull") {
         if (!quantitativeMatchStage['periodo_atividade.inicio']) {
             quantitativeMatchStage['periodo_atividade.inicio'] = {};
        }
        quantitativeMatchStage['periodo_atividade.inicio']['$ne'] = null;
        continue; // Pula para a próxima chave
    }
    if (key === "data_exclusao_ufpe_isnull") {
         if (!quantitativeMatchStage['periodo_atividade.fim']) {
             quantitativeMatchStage['periodo_atividade.fim'] = {};
        }
        quantitativeMatchStage['periodo_atividade.fim']['$eq'] = null;
        continue; // Pula para a próxima chave
    }
    if (key === "data_exclusao_ufpe_notnull") {
         if (!quantitativeMatchStage['periodo_atividade.fim']) {
             quantitativeMatchStage['periodo_atividade.fim'] = {};
        }
        quantitativeMatchStage['periodo_atividade.fim']['$ne'] = null;
        continue; // Pula para a próxima chave
    }
            const parts = key.split('_'); // Ex: "artigos_gt" -> ["artigos", "gt"]
            if (parts.length < 2) continue; // Ignora filtros normais (centro, groupBy, etc.)

            const op = parts.pop(); // "gt"
            const field = parts.join('_'); // "artigos" ou "total_orientacoes"
            
            const mongoOp = {
                'gt': '$gt', 'gte': '$gte', 'lt': '$lt', 'lte': '$lte', 'eq': '$eq', 'ne': '$ne'
            }[op];
            
            if (!mongoOp || !fieldMap.hasOwnProperty(field)) continue; // Operador ou campo inválido
            
            // --- INÍCIO DA CORREÇÃO ---
            const isDateField = (field === 'data_ingresso_ufpe' || field === 'data_exclusao_ufpe');
            let value;

           

            if (isDateField) {
                // Tenta converter a string da query (ex: "2020-01-01") para um timestamp
                value = new Date(req.query[key]); 
            
            } else {
                // Mantém a lógica original para campos numéricos (artigos, livros, etc.)
                value = parseInt(req.query[key], 10);
            }
            if (isNaN(value)) continue; // Valor não numérico

            // Define o caminho correto para o campo (aninhado ou não)
            let fieldPath = groupBy ? field : fieldMap[field];

            // Ignora filtros de "total" se não estivermos agrupando
            if (!groupBy && field.startsWith('total_')) {
                continue;
            }

            if (!quantitativeMatchStage[fieldPath]) {
                quantitativeMatchStage[fieldPath] = {};
            }
            quantitativeMatchStage[fieldPath][mongoOp] = value;
        }

        // Adicionar agrupamento se especificado
        if (groupBy) {
            const groupFields = groupBy.split(',');
            const groupStage = {
                _id: {}
            };

            // Adicionar campos de agrupamento
            groupFields.forEach(field => {
                groupStage._id[field] = `$${field}`;
            });

            // Adicionar contagem e somas para cada tipo de produção
            groupStage.total_pesquisadores = { $sum: 1 };
            groupStage.artigos = { $sum: '$contagem.artigos' };
            groupStage.livros = { $sum: '$contagem.livros' };
            groupStage.capitulos = { $sum: '$contagem.capitulos' };
            groupStage.trabalhos_eventos = { $sum: '$contagem.trabalhos_eventos' };
            groupStage.textos_jornais = { $sum: '$contagem.textos_jornais' };
            groupStage.outras_producoes_bibliograficas = { $sum: '$contagem.outras_producoes_bibliograficas' };
            groupStage.partituras_musicais = { $sum: '$contagem.partituras_musicais' };
            groupStage.musicas = { $sum: '$contagem.producao_artistica_cultural.musicas' };
            groupStage.artes_cenicas = { $sum: '$contagem.producao_artistica_cultural.artes_cenicas' };
            groupStage.softwares = { $sum: '$contagem.softwares' };
            groupStage.patentes = { $sum: '$contagem.patentes' };
            groupStage.orientacoes_concluidas_doutorado = { $sum: '$contagem.orientacoes_concluidas.doutorado' };
            groupStage.orientacoes_concluidas_mestrado = { $sum: '$contagem.orientacoes_concluidas.mestrado' };
            groupStage.orientacoes_concluidas_pos_doutorado = { $sum: '$contagem.orientacoes_concluidas.pos_doutorado' };

            groupStage.orientacoes_andamento_doutorado = { $sum: '$contagem.orientacoes_andamento.doutorado' };
            groupStage.orientacoes_andamento_mestrado = { $sum: '$contagem.orientacoes_andamento.mestrado' };
            groupStage.orientacoes_andamento_pos_doutorado = { $sum: '$contagem.orientacoes_andamento.pos_doutorado' };

            // Total de produções bibliográficas (artigos + trabalhos_eventos + capitulos + livros)
            groupStage.total_producao_bibliografica = {
                $sum: {
                    $add: ['$contagem.artigos', '$contagem.trabalhos_eventos', '$contagem.capitulos', '$contagem.livros', '$contagem.outras_producoes_bibliograficas', '$contagem.partituras_musicais']
                }
            };

            // Total de produção técnica (patentes + softwares)
            groupStage.total_producao_tecnica = {
                $sum: {
                    $add: ['$contagem.patentes', '$contagem.softwares']
                }
            };

            groupStage.total_producao_artistica_cultural = {
                $sum: {
                    $add: ['$contagem.producao_artistica_cultural.artes_cenicas', '$contagem.producao_artistica_cultural.musicas']
                }
            };

            // Total de orientações concluídas
            groupStage.total_orientacoes_concluidas = {
                $sum: {
                    $add: [
                        '$contagem.orientacoes_concluidas.doutorado',
                        '$contagem.orientacoes_concluidas.mestrado',
                        '$contagem.orientacoes_concluidas.pos_doutorado'
                    ]
                }
            };

            // Total de orientações em andamento
            groupStage.total_orientacoes_andamento = {
                $sum: {
                    $add: [
                        '$contagem.orientacoes_andamento.doutorado',
                        '$contagem.orientacoes_andamento.mestrado',
                        '$contagem.orientacoes_andamento.pos_doutorado'
                    ]
                }
            };

             // Total geral de orientações (concluídas + em andamento)
             groupStage.total_orientacoes = {
                $sum: {
                    $add: [
                        '$contagem.orientacoes_concluidas.doutorado',
                        '$contagem.orientacoes_concluidas.mestrado',
                        '$contagem.orientacoes_concluidas.pos_doutorado',
                        '$contagem.orientacoes_andamento.doutorado',
                        '$contagem.orientacoes_andamento.mestrado',
                        '$contagem.orientacoes_andamento.pos_doutorado'
                    ]
                }
            };

            pipeline.push({ $group: groupStage });

            // --- ETAPA 4: ADICIONA O FILTRO QUANTITATIVO (DEPOIS DO GROUP) ---
            if (Object.keys(quantitativeMatchStage).length > 0) {
                pipeline.push({ $match: quantitativeMatchStage });
            }

            // Ordenar resultados pelo _id
            pipeline.push({ $sort: { _id: 1 } });
        }else {
            // --- ETAPA 4 (Alternativa): ADICIONA O FILTRO QUANTITATIVO (SEM GROUP) ---
            if (Object.keys(quantitativeMatchStage).length > 0) {
                pipeline.push({ $match: quantitativeMatchStage });
            }
        }

        const results = await producaoGeralCollection.aggregate(pipeline).toArray();
        
        res.status(200).json({
            success: true,
            data: results,
            total: results.length
        });
    } catch (error) {
        console.error('Erro ao buscar produção geral:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar produção geral',
            error: error.message
        });
    }
};

module.exports = {
    ProducaoGeralcreate,
    getProducaoGeral
};
