
const multer = require('multer');
const path = require('path');


//----------------------------Config Multer Researchers----------------------------------------------------------

// Configuração do Multer para upload simples
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './'); // Raiz do projeto
    },
    filename: function (req, file, cb) {
      // Mantém o nome original do arquivo
      cb(null, file.originalname);
    }
  });
  
  // Filtro para aceitar apenas arquivos .xlsx, .xls e .csv
  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos Excel (.xlsx, .xls) e CSV são permitidos'), false);
    }
  };
  
  const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 100 * 1024 * 1024 // Limite de 100MB
    }
  });
  

  module.exports = upload