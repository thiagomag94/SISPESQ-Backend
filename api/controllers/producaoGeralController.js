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
            {
                $addFields: {
                    periodo_atividade: {
                        inicio: { $ifNull: ['$DATA_INGRESSO_UFPE', new Date(0)] },
                        fim: {
                            $cond: {
                                if: { $eq: ['$SITUACAO_FUNCIONAL', 'APOSENTADO'] },
                                then: {
                                    $ifNull: [
                                        { $dateAdd: { startDate: '$DATA_EXCLUSAO', unit: 'year', amount: 10 } },
                                        new Date()
                                    ]
                                },
                                else: { $ifNull: ['$DATA_EXCLUSAO', new Date()] }
                            }
                        }
                    }
                }
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
                                            { $gte: [{ $year: '$$artigo.ANO_DO_ARTIGO' }, { $year: '$periodo_atividade.inicio' }] },
                                            { $lte: [{ $year: '$$artigo.ANO_DO_ARTIGO' }, { $year: '$periodo_atividade.fim' }] }
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
                                            { $gte: [{ $year: '$$livro.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                            { $lte: [{ $year: '$$livro.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
                                            { $gte: [{ $year: '$$capitulo.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                            { $lte: [{ $year: '$$capitulo.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
                                            { $gte: [{ $year: '$$trabalho.ANO_DO_TRABALHO' }, { $year: '$periodo_atividade.inicio' }] },
                                            { $lte: [{ $year: '$$trabalho.ANO_DO_TRABALHO' }, { $year: '$periodo_atividade.fim' }] }
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
                                            { $gte: [{ $year: '$$texto.ANO_DO_TEXTO' }, { $year: '$periodo_atividade.inicio' }] },
                                            { $lte: [{ $year: '$$texto.ANO_DO_TEXTO' }, { $year: '$periodo_atividade.fim' }] }
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
                                            { $gte: [{ $year: '$$software.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                            { $lte: [{ $year: '$$software.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
                                            { $gte: [{ $year: '$$patente.DATA_DE_DEPOSITO' }, { $year: '$periodo_atividade.inicio' }] },
                                            { $lte: [{ $year: '$$patente.DATA_DE_DEPOSITO' }, { $year: '$periodo_atividade.fim' }] }
                                        ]
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
                                                { $gte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                                { $lte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
                                                { $gte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                                { $lte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
                                                { $gte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                                { $lte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
                                                { $gte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                                { $lte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
                                                { $gte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                                { $lte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
                                                { $gte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                                { $lte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
                                        { $gte: [{ $year: '$$artigo.ANO_DO_ARTIGO' }, { $year: '$periodo_atividade.inicio' }] },
                                        { $lte: [{ $year: '$$artigo.ANO_DO_ARTIGO' }, { $year: '$periodo_atividade.fim' }] }
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
                                        { $gte: [{ $year: '$$livro.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                        { $lte: [{ $year: '$$livro.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
                                        { $gte: [{ $year: '$$capitulo.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                        { $lte: [{ $year: '$$capitulo.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
                                        { $gte: [{ $year: '$$trabalho.ANO_DO_TRABALHO' }, { $year: '$periodo_atividade.inicio' }] },
                                        { $lte: [{ $year: '$$trabalho.ANO_DO_TRABALHO' }, { $year: '$periodo_atividade.fim' }] }
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
                                        { $gte: [{ $year: '$$texto.ANO_DO_TEXTO' }, { $year: '$periodo_atividade.inicio' }] },
                                        { $lte: [{ $year: '$$texto.ANO_DO_TEXTO' }, { $year: '$periodo_atividade.fim' }] }
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
                                        { $gte: [{ $year: '$$software.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                        { $lte: [{ $year: '$$software.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
                                        { $gte: [{ $year: '$$patente.DATA_DE_DEPOSITO' }, { $year: '$periodo_atividade.inicio' }] },
                                        { $lte: [{ $year: '$$patente.DATA_DE_DEPOSITO' }, { $year: '$periodo_atividade.fim' }] }
                                    ]
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
                                            { $gte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                            { $lte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
                                            { $gte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                            { $lte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
                                            { $gte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                            { $lte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
                                            { $gte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                            { $lte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
                                            { $gte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                            { $lte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
                                            { $gte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.inicio' }] },
                                            { $lte: [{ $year: '$$orientacao.ANO' }, { $year: '$periodo_atividade.fim' }] }
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
        const { centro, departamento, situacao_funcional, groupBy } = req.query;
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

        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
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
                    $add: ['$contagem.artigos', '$contagem.trabalhos_eventos', '$contagem.capitulos', '$contagem.livros']
                }
            };

            // Total de produção técnica (patentes + softwares)
            groupStage.total_producao_tecnica = {
                $sum: {
                    $add: ['$contagem.patentes', '$contagem.softwares']
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

            // Ordenar resultados pelo _id
            pipeline.push({ $sort: { _id: 1 } });
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
