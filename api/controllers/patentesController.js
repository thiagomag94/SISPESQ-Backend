const { Datapesqdb, Researcherdb} = require('../db');
const {lattesdb} = require('../models/Lattes');


const getPatentes = async (req, res) => {
    try {
        const { id_docente } = req.params;
        const docente = await Researcherdb.findById(id_docente);
        const dataIngresso = docente.DATA_INGRESSO_UFPE
        const dataExclusao = docente.DATA_EXCLUSAO_UFPE || null
        const id_lattes = docente.ID_Lattes;
        const lattes = await lattesdb.find({"CURRICULO_VITAE.ID_Lattes": id_lattes});
        const patentesGeral = lattes.CURRICULO_VITAE.PRODUCAO_TECNICA.PATENTE;
        
        
        res.status(200).json({patentesGeral, patentesAposIngresso, patentesAgrupadasPorAno})
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar patentes', error: error.message });
    }
}



module.exports = {
    getPatentes
}



