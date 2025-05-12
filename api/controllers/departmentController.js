const {Departamentodb, Researcherdb} = require('../db')
const {Datapesqdb} = require('../db')
const { v4: uuidv4 } = require('uuid'); 

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
    const { departamento, centro, id } = req.query;
    console.log("ID CHEGANDO", id)

    // Construindo a consulta com base nos parâmetros
    let query = {}


    if(!id){
      if (departamento) {
        const palavras = departamento.trim().split(' ').filter(Boolean); // Divide o nome em palavras
       
  
        const regexPalavras = palavras.map(palavra => new RegExp(palavra, 'i')); // Cria um regex para cada palavra
        
        // Se houver múltiplas palavras, usa `$and` para que todas sejam encontradas no nome
        if (regexPalavras.length > 1) {
          query.$and = regexPalavras.map(regex => ({ NOME_DEPARTAMENTO: regex }));
        } else {
          query.NOME_DEPARTAMENTO = regexPalavras[0]; // Apenas uma palavra, busca diretamente
        }
      }
      // Consultando os dados no banco de dados com os filtros aplicados
      console.log(query)
      const departamentos = await Departamentodb.find(query);
       // Retornando os resultados
       console.log(departamentos)
    
       res.status(200).json({ departamentos:departamentos, total_departamentos:departamentos.length });
       
    } else{
      query._id=id;
     
      try{
        const departamentos = await Departamentodb.findOne(query).populate('ID_DOCENTES');
        //console.log(departamentos)
        res.status(200).json({ departamentos:departamentos });
      }catch(error){res.status(500).json({ error: error, message:"id inválido ou inexistente" });}
        

    }

   

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
    await Departamentodb.deleteMany({});
    // Agrupar docentes por UORG_LOTACAO e coletar seus IDs
    const docentesAgrupados = await Researcherdb.aggregate([
      {
        $match: {
          UORG_LOTACAO: { $exists: true, $ne: null, $nin: [""] }
        } // Filtra docentes com UORG_LOTACAO válido
      },
      {
          $group: {
              _id: "$UORG_LOTACAO", // Agrupa por UORG_LOTACAO
              docentesIds: { $push: "$_id" }, // Coleta os IDs dos docentes
              centro:  { $first: "$SIGLA_CENTRO" },
              count: { $sum: 1 } // Conta o número de docentes por grupo
          }
      }
  ]);

  // Criar documentos dos departamentos
  for (const grupo of docentesAgrupados) {
      const uorgLotacao = grupo._id;
      const docentesIds = grupo.docentesIds;
      const centro = grupo.centro

      // Verificar se o departamento já existe
      const departamentoExistente = await Departamentodb.findOne({ NOME_DEPARTAMENTO: uorgLotacao });
      if (!departamentoExistente) {
          // Criar novo departamento
          const novoDepartamento = new Departamentodb({
              NOME_DEPARTAMENTO: uorgLotacao, // Preencha com o nome correto
              SIGLA_CENTRO: centro, // Se necessário, ajuste conforme a lógica do seu sistema
              NUM_DOCENTES: grupo.count,
              NUM_DOCENTES_LATTES: 0, // Preencha com o valor correto
              NUM_DOCENTES_ORCID: 0, // Preencha com o valor correto
              NUM_DOCENTES_SCOPUS: 0, // Preencha com o valor correto
              NUM_DOCENTES_SCHOLAR: 0, // Preencha com o valor correto
              ID_DOCENTES: docentesIds,
              PRODUCAO: {
                  2024: { BIBLIOGRAFICA: 0, TECNICA: 0, ARTISTICA: 0 },
                  2023: { BIBLIOGRAFICA: 0, TECNICA: 0, ARTISTICA: 0 },
                  2022: { BIBLIOGRAFICA: 0, TECNICA: 0, ARTISTICA: 0 },
                  2021: { BIBLIOGRAFICA: 0, TECNICA: 0, ARTISTICA: 0 },
                  2020: { BIBLIOGRAFICA: 0, TECNICA: 0, ARTISTICA: 0 }
              }
          });

          // Salvar o novo departamento no banco de dados
          await novoDepartamento.save();
      

      } else {
      
      }
  }

  
 
 
  res.status(201).json({message:"Departamentos criados"})
} catch (error) {
 console.error('Erro ao criar departamentos:', error);
 res.status(500).json({message: "Houve erro na criação"})
} 
}




//------------------------UPDATE----------------------------------------------------------------

async function updateDepartments(req, res) {
  try {
    const { id } = req.params;
   
    const udpdatedDepartment = await Departamentodb.findByIdAndUpdate(id, req.body, { new: true });
    
    if (!udpdatedDepartment) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    res.status(200).json(udpdatedDepartment);
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