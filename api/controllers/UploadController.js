const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 1. Configuração de diretórios com verificação
const UPLOAD_ROOT = os.platform() === 'win32' 
  ? path.join('data-uploads')
  : '/var/data-uploads';

const TMP_DIR = path.join(UPLOAD_ROOT, 'tmp');
const PROCESSED_DIR = path.join(UPLOAD_ROOT, 'processed');

// 2. Função para verificar/criar diretórios com validação
const ensureDirectoriesExist = () => {
  try {
    [UPLOAD_ROOT, TMP_DIR, PROCESSED_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Diretório criado: ${dir}`);
      }
      // Verifica permissão de escrita
      fs.accessSync(dir, fs.constants.W_OK);
    });
    return true;
  } catch (error) {
    console.error('Falha ao criar/verificar diretórios:', error);
    return false;
  }
};

// 3. Middleware de verificação
const checkUploadDirs = (req, res, next) => {
  if (!ensureDirectoriesExist()) {
    return res.status(500).json({
      success: false,
      message: 'Erro no servidor: diretórios de upload não disponíveis'
    });
  }
  next();
};

// 4. Configuração do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TMP_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos Excel e CSV são permitidos'), false);
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 }
});

// 5. Rota modificada
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo enviado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Upload realizado com sucesso',
      file: req.file
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro no processamento do arquivo'
    });
  }
};

// 6. Exportação
module.exports = {
  uploadMiddleware: upload.single('file'),
  checkUploadDirs,
  uploadFile
};