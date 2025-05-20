
const { Datapesqdb, Researcherdb} = require('../db');
const {lattesdb} = require('../models/Lattes');

const getOrientacoes = async (req, res) => {
    try{
        const id_docente = req.params.id_docente;
        
        // Buscar dados do docente no banco Researcher
        const docente = await Researcherdb.findById(id_docente);
        if (!docente) {
            return res.status(404).json({ error: "Docente não encontrado" });
        }

        const dataIngresso = docente.DATA_INGRESSO_UFPE ? new Date(docente.DATA_INGRESSO_UFPE) : null;
        const dataExclusao = docente.DATA_EXCLUSAO_UFPE ? new Date(docente.DATA_EXCLUSAO_UFPE) : null;
        const situacaoFuncional = docente.SITUACAO_FUNCIONAL || "";
        const id_lattes = docente.ID_Lattes;

        if (!id_lattes) {
            return res.status(404).json({ error: "ID Lattes não encontrado para o docente" });
        }

        // Ajustar data de exclusão para aposentados (adicionar 10 anos)
        let dataExclusaoAjustada = dataExclusao;
        if (situacaoFuncional === "APOSENTADO" && dataExclusao) {
            dataExclusaoAjustada = new Date(dataExclusao);
            dataExclusaoAjustada.setFullYear(dataExclusaoAjustada.getFullYear() + 10);
        }

        // Função para gerar array de anos
        const gerarArrayAnos = (dataInicio, dataFim) => {
            const anos = [];
            const anoInicio = dataInicio.getFullYear();
            const anoFim = dataFim ? dataFim.getFullYear() : new Date().getFullYear();
            
            for (let ano = anoInicio; ano <= anoFim; ano++) {
                anos.push(ano);
            }
            return anos;
        };

        // Gerar array de anos para preenchimento
        const anosCompletos = gerarArrayAnos(dataIngresso, dataExclusaoAjustada);

        // Pipeline de agregação para orientações concluídas
        const pipelineConcluidas = [
            { $match: { 'CURRICULO_VITAE.ID_Lattes': id_lattes } },
            { $project: {
                orientacoesConcluidas: {
                    mestrado: {
                        totalGeral: { $size: '$CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_MESTRADO' },
                        totalFiltrado: {
                            $size: {
                                $filter: {
                                    input: '$CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_MESTRADO',
                                    as: 'orientacao',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$orientacao.ANO', dataIngresso] },
                                            dataExclusaoAjustada ? { $lte: ['$$orientacao.ANO', dataExclusaoAjustada] } : true
                                        ]
                                    }
                                }
                            }
                        },
                        porAno: {
                            $map: {
                                input: anosCompletos,
                                as: 'ano',
                                in: {
                                    label: { $toString: '$$ano' },
                                    valor: {
                                        $let: {
                                            vars: {
                                                contagem: {
                                                    $size: {
                                                        $filter: {
                                                            input: '$CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_MESTRADO',
                                                            as: 'orientacao',
                                                            cond: { $eq: [{ $year: '$$orientacao.ANO' }, '$$ano'] }
                                                        }
                                                    }
                                                }
                                            },
                                            in: '$$contagem'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    doutorado: {
                        totalGeral: { $size: '$CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_DOUTORADO' },
                        totalFiltrado: {
                            $size: {
                                $filter: {
                                    input: '$CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_DOUTORADO',
                                    as: 'orientacao',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$orientacao.ANO', dataIngresso] },
                                            dataExclusaoAjustada ? { $lte: ['$$orientacao.ANO', dataExclusaoAjustada] } : true
                                        ]
                                    }
                                }
                            }
                        },
                        porAno: {
                            $map: {
                                input: anosCompletos,
                                as: 'ano',
                                in: {
                                    label: { $toString: '$$ano' },
                                    valor: {
                                        $let: {
                                            vars: {
                                                contagem: {
                                                    $size: {
                                                        $filter: {
                                                            input: '$CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_DOUTORADO',
                                                            as: 'orientacao',
                                                            cond: { $eq: [{ $year: '$$orientacao.ANO' }, '$$ano'] }
                                                        }
                                                    }
                                                }
                                            },
                                            in: '$$contagem'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    posDoutorado: {
                        totalGeral: { $size: '$CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_POS_DOUTORADO' },
                        totalFiltrado: {
                            $size: {
                                $filter: {
                                    input: '$CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_POS_DOUTORADO',
                                    as: 'orientacao',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$orientacao.ANO', dataIngresso] },
                                            dataExclusaoAjustada ? { $lte: ['$$orientacao.ANO', dataExclusaoAjustada] } : true
                                        ]
                                    }
                                }
                            }
                        },
                        porAno: {
                            $map: {
                                input: anosCompletos,
                                as: 'ano',
                                in: {
                                    label: { $toString: '$$ano' },
                                    valor: {
                                        $let: {
                                            vars: {
                                                contagem: {
                                                    $size: {
                                                        $filter: {
                                                            input: '$CURRICULO_VITAE.ORIENTACOES_CONCLUIDAS.ORIENTACOES_CONCLUIDAS_PARA_POS_DOUTORADO',
                                                            as: 'orientacao',
                                                            cond: { $eq: [{ $year: '$$orientacao.ANO' }, '$$ano'] }
                                                        }
                                                    }
                                                }
                                            },
                                            in: '$$contagem'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }}
        ];

        // Pipeline de agregação para orientações em andamento
        const pipelineEmAndamento = [
            { $match: { 'CURRICULO_VITAE.ID_Lattes': id_lattes } },
            { $project: {
                orientacoesEmAndamento: {
                    mestrado: {
                        totalGeral: { $size: '$CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_MESTRADO' },
                        totalFiltrado: {
                            $size: {
                                $filter: {
                                    input: '$CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_MESTRADO',
                                    as: 'orientacao',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$orientacao.ANO', dataIngresso] },
                                            dataExclusaoAjustada ? { $lte: ['$$orientacao.ANO', dataExclusaoAjustada] } : true
                                        ]
                                    }
                                }
                            }
                        },
                        porAno: {
                            $map: {
                                input: anosCompletos,
                                as: 'ano',
                                in: {
                                    label: { $toString: '$$ano' },
                                    valor: {
                                        $let: {
                                            vars: {
                                                contagem: {
                                                    $size: {
                                                        $filter: {
                                                            input: '$CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_MESTRADO',
                                                            as: 'orientacao',
                                                            cond: { $eq: [{ $year: '$$orientacao.ANO' }, '$$ano'] }
                                                        }
                                                    }
                                                }
                                            },
                                            in: '$$contagem'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    doutorado: {
                        totalGeral: { $size: '$CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_DOUTORADO' },
                        totalFiltrado: {
                            $size: {
                                $filter: {
                                    input: '$CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_DOUTORADO',
                                    as: 'orientacao',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$orientacao.ANO', dataIngresso] },
                                            dataExclusaoAjustada ? { $lte: ['$$orientacao.ANO', dataExclusaoAjustada] } : true
                                        ]
                                    }
                                }
                            }
                        },
                        porAno: {
                            $map: {
                                input: anosCompletos,
                                as: 'ano',
                                in: {
                                    label: { $toString: '$$ano' },
                                    valor: {
                                        $let: {
                                            vars: {
                                                contagem: {
                                                    $size: {
                                                        $filter: {
                                                            input: '$CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_DOUTORADO',
                                                            as: 'orientacao',
                                                            cond: { $eq: [{ $year: '$$orientacao.ANO' }, '$$ano'] }
                                                        }
                                                    }
                                                }
                                            },
                                            in: '$$contagem'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    posDoutorado: {
                        totalGeral: { $size: '$CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_POS_DOUTORADO' },
                        totalFiltrado: {
                            $size: {
                                $filter: {
                                    input: '$CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_POS_DOUTORADO',
                                    as: 'orientacao',
                                    cond: {
                                        $and: [
                                            { $gte: ['$$orientacao.ANO', dataIngresso] },
                                            dataExclusaoAjustada ? { $lte: ['$$orientacao.ANO', dataExclusaoAjustada] } : true
                                        ]
                                    }
                                }
                            }
                        },
                        porAno: {
                            $map: {
                                input: anosCompletos,
                                as: 'ano',
                                in: {
                                    label: { $toString: '$$ano' },
                                    valor: {
                                        $let: {
                                            vars: {
                                                contagem: {
                                                    $size: {
                                                        $filter: {
                                                            input: '$CURRICULO_VITAE.ORIENTACOES_EM_ANDAMENTO.ORIENTACOES_EM_ANDAMENTO_PARA_POS_DOUTORADO',
                                                            as: 'orientacao',
                                                            cond: { $eq: [{ $year: '$$orientacao.ANO' }, '$$ano'] }
                                                        }
                                                    }
                                                }
                                            },
                                            in: '$$contagem'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }}
        ];

        // Executar as agregações
        const [resultadoConcluidas, resultadoEmAndamento] = await Promise.all([
            lattesdb.aggregate(pipelineConcluidas),
            lattesdb.aggregate(pipelineEmAndamento)
        ]);

        if (!resultadoConcluidas.length || !resultadoEmAndamento.length) {
            return res.status(404).json({ error: "Currículo Lattes não encontrado" });
        }

        // Combinar os resultados
        const resposta = {
            orientacoesConcluidas: resultadoConcluidas[0].orientacoesConcluidas,
            orientacoesEmAndamento: resultadoEmAndamento[0].orientacoesEmAndamento
        };

        res.status(200).json(resposta);

    }catch(err){
        console.error('Erro ao buscar orientações:', err);
        res.status(500).json({ error: "Erro ao buscar orientações" });
    }
}

module.exports = {
    getOrientacoes
}
