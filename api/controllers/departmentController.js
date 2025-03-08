const {Departamentodb} = require('../db')
const {Datapesqdb} = require('../db')

//const getDepartments = async (req, res) => {
 // const { departamento } = req.query;
 // try {
   // const array_departamentos = await Datapesqdb.distinct('UORG_LOTACAO');
   // if (departamento) {
 //     const resultado_query = await Datapesqdb.find({
 //       UORG_LOTACAO: { $regex: `${departamento}$`, $options: 'i' }
    //  });
   //   if (resultado_query.length > 0) {
  //      res.status(200).json({ professores_por_departamento: resultado_query, departamentos: array_departamentos });
  //    } else {
  //      res.status(200).json({ professores_por_departamento: [], departamentos: array_departamentos });
  //    }
  //  } else {
  //    res.status(400).json({ message: "Parâmetro 'departamento' não fornecido" });
  //  }
  //} catch (error) {
  //  res.status(500).json({ error: 'Erro interno do servidor' });
 // }
//};

//module.exports = { getDepartments };


//---------------------------GET --------------------------------------

const getDepartments = async (req, res) => {
  try {
    // Extrai os parâmetros de busca e filtro da query string
    const { departamento, centro } = req.query;
    
    // Construindo a consulta com base nos parâmetros
    let query = {};

    // Filtro por professor com a lógica de dividir e buscar por cada palavra do nome
    if (departamento) {
      const palavras = departamento.split(' ').filter(Boolean); // Divide o nome em palavras
      const regexPalavras = palavras.map(palavra => new RegExp(palavra, 'i')); // Cria um regex para cada palavra
      query.PESQUISADOR = { $and: regexPalavras.map(regex => ({ PESQUISADOR: regex })) };  // Aplica o regex para cada palavra no campo PESQUISADOR
    }

    // Filtro por centro (SIG_CENTRO), se informado
    if (centro) {
      query.SIGLA_CENTRO= centro;
    }


    // Consultando os dados no banco de dados com os filtros aplicados
    const departamentos = await Departamentodb.find(query);

    // Retornando os resultados
      res.status(200).json({ departamentos: departamentos, total_departamentos:departamentos.length });

  } catch (error) {
    res.status(500).json({ error: error });
  }
}


//------------------------CREATE--------------------------------------------------------------
async function createDepartments(req, res) {
  try {
    
    const newDepartment = new Departamentodb(req.body);
    await newDepartment.save();
    res.status(201).json({message:"Departamento criado com sucesso"});
  } catch (err) {
    res.status(400).json({ error: 'Erro ao criar departamento', details: err });
  }
}

async function createDepartmentsFromResearchers(req, res) {
  try {
    const departments = await Datapesqdb.aggregate([
        {
          $group:{
            _id: "$UORG_LOTACAO",
            SIGLA_CENTRO: {$first: "$SIGLA_CENTRO"},
            ID_DOCENTES:{$push:"$_id"},
            NOME_DEPARTAMENTO:{$first:"$UORG_LOTACAO"}
          }
        },
        {
          $project:{
            _id: 0, //exclui o campo _id
            ID_DEPARTAMENTO: {$concat: ["$_id", "_dep"]},
            NOME_DEPARTAMENTO:1,
            SIGLA_CENTRO:1,
            ID_DOCENTES:1,
            NUM_DOCENTES: 1,
            NUM_DOCENTES_LATTES: 1,
            NUM_DOCENTES_ORCID: 1,
            NUM_DOCENTES_SCOPUS: 1,
            NUM_DOCENTES_SCHOLAR: 1,
            PRODUCAO:1


          }
        }

    ])
    departments.forEach(async (departamentos) => {
      const newDepartment = new Departamentodb(departamentos)
      await newDepartment.save()
    })
    //const newDepartment = new Departamentodb(req.body);
    //await newDepartment.save();
    res.status(201).json({message:"Departamento criado com sucesso"});
  } catch (err) {
    res.status(400).json({ error: 'Erro ao criar departamento', details: err });
  }
}

//------------------------UPDATE----------------------------------------------------------------

async function updateDepartments(req, res) {
  try {
    const { id } = req.params;
    const udpdateDepartment = await Departamentodb.findByIdAndUpdate(id, req.body, { new: true });
    
    if (!udpdateDepartment) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    res.status(200).json(updatedDataPesq);
  } catch (err) {
    res.status(400).json({ error: 'Erro ao atualizar documento', details: err });
  }
}

async function deleteDepartments(req, res) {
  try {
    const { id } = req.params;
    const deletedDepartment = await Departamentodb.findByIdAndDelete(id);
    
    if (!deletedDepartment) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    res.status(200).json({ message: 'Documento excluído com sucesso' });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao excluir documento', details: err });
  }
}

async function deleteAllDepartments(req, res) {
  try {
    
    const deleteDepartment = await Departamentodb.deleteMany({});
    
    if (!deleteDepartment) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    res.status(200).json({ message: 'Documento excluído com sucesso' });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao excluir documento', details: err });
  }
}


module.exports ={
  getDepartments,
  updateDepartments,
  createDepartments,
  createDepartmentsFromResearchers,
  deleteDepartments,
  deleteAllDepartments

}