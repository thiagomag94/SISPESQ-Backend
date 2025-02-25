const { Datapesqdb } = require('../db');

const getDepartments = async (req, res) => {
  const { departamento } = req.query;
  try {
    const array_departamentos = await Datapesqdb.distinct('UORG_LOTACAO');
    if (departamento) {
      const resultado_query = await Datapesqdb.find({
        UORG_LOTACAO: { $regex: `${departamento}$`, $options: 'i' }
      });
      if (resultado_query.length > 0) {
        res.status(200).json({ professores_por_departamento: resultado_query, departamentos: array_departamentos });
      } else {
        res.status(200).json({ professores_por_departamento: [], departamentos: array_departamentos });
      }
    } else {
      res.status(400).json({ message: "Parâmetro 'departamento' não fornecido" });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = { getDepartments };
