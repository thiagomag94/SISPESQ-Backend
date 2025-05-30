const { Researcherdb} = require('../db');
const {lattesdb} = require('../models/Lattes');

const getPatentes = async (req, res) => {
    try {
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

        // 1. Consulta para todas as patentes
        const patentesGeral = await lattesdb.aggregate([
            {
                $match: {
                    "CURRICULO_VITAE.ID_Lattes": id_lattes
                }
            },
            {
                $project: {
                    _id: 0,
                    patentes: "$CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE"
                }
            }
        ]);

        // 2. Consulta para patentes filtradas por período
        const patentesFiltradas = await lattesdb.aggregate([
            {
                $match: {
                    "CURRICULO_VITAE.ID_Lattes": id_lattes
                }
            },
            {
                $unwind: {
                    path: "$CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 0,
                    patente: "$CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE",
                    dataPatente: {
                        $cond: {
                            if: { $ifNull: ["$CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.DATA_DE_DEPOSITO", false] },
                            then: "$CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.DATA_DE_DEPOSITO",
                            else: "$CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.DATA_DE_CONCESSAO"
                        }
                    }
                }
            },
            {
                $match: {
                    patente: { $ne: null },
                    dataPatente: { $ne: null },
                    $expr: {
                        $and: [
                            { $gte: ["$dataPatente", dataIngresso] },
                            dataExclusaoAjustada ? { $lte: ["$dataPatente", dataExclusaoAjustada] } : true
                        ]
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    patente: 1
                }
            }
        ]);

        // 3. Consulta para patentes agrupadas por ano
        const patentesPorAno = await lattesdb.aggregate([
            {
                $match: {
                    "CURRICULO_VITAE.ID_Lattes": id_lattes
                }
            },
            {
                $unwind: {
                    path: "$CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 0,
                    patente: "$CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE",
                    dataPatente: {
                        $cond: {
                            if: { $ifNull: ["$CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.DATA_DE_DEPOSITO", false] },
                            then: "$CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.DATA_DE_DEPOSITO",
                            else: "$CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE.DATA_DE_CONCESSAO"
                        }
                    }
                }
            },
            {
                $match: {
                    patente: { $ne: null },
                    dataPatente: { $ne: null },
                    $expr: {
                        $and: [
                            { $gte: ["$dataPatente", dataIngresso] },
                            dataExclusaoAjustada ? { $lte: ["$dataPatente", dataExclusaoAjustada] } : true
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: { $year: "$dataPatente" },
                    patentes: { $push: "$patente" }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Formatar o resultado com todos os anos preenchidos
        const resultado = {
            patentesGeral: patentesGeral[0]?.patentes || [],
            patentesAposIngresso: patentesFiltradas.map(p => p.patente),
            patentesPorAno: anosCompletos.map(ano => {
                const patentesDoAno = patentesPorAno.find(p => p._id === ano);
                return {
                    label: ano.toString(),
                    valor: patentesDoAno ? patentesDoAno.patentes.length : 0
                };
            })
        };

        res.status(200).json(resultado);
    } catch (err) {
        console.error('Erro ao buscar patentes:', err);
        res.status(500).json({ error: "Erro ao buscar patentes" });
    }
};

module.exports = {
    getPatentes,
    
};



