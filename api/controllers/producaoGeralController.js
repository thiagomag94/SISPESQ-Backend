const { Datapesqdb, Researcherdb} = require('../db');
const {lattesdb} = require('../models/Lattes');
const mongoose = require('mongoose');

const ProducaoGeral = async (req, res) => {
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
                                        { $add: ['$DATA_EXCLUSAO', 1000 * 60 * 60 * 24 * 365 * 10] },
                                        new Date()
                                    ]
                                },
                                else: { $ifNull: ['$DATA_EXCLUSAO', new Date()] }
                            }
                        }
                    }
                }
            },
            // Calculamos as contagens usando expressões condicionais
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
                                    input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS.0.LIVROS_PUBLICADOS_OU_ORGANIZADOS', []] },
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
                                    input: { $ifNull: ['$lattesData.CURRICULO_VITAE.PRODUCAO_BIBLIOGRAFICA.LIVROS_E_CAPITULOS.0.CAPITULO_DE_LIVROS_PUBLICADOS', []] },
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
                    contagem: 1
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
        const { centro, departamento, situacao_funcional } = req.query;
        
        // Acessar a collection criada pelo $out
        const producaoGeralCollection = mongoose.connection.collection('producao_geral');
        
        // Construir query baseada nos filtros
        const query = {};
        if (centro) query.centro = centro;
        if (departamento) query.departamento = departamento;
        if (situacao_funcional) query.situacao_funcional = situacao_funcional;

        const results = await producaoGeralCollection.find(query).toArray();
        
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
    ProducaoGeral,
    getProducaoGeral
};
