# Sistema de Pesquisa e Pesquisadores (SISPESQ) - Backend

## Descrição do Projeto

O SISPESQ é um sistema backend desenvolvido para gerenciar informações de pesquisadores, suas produções científicas e dados acadêmicos. O sistema é construído em Node.js com Express.js e utiliza MongoDB como banco de dados.

## Tecnologias Principais

- **Node.js** (Versão 22.4.0)
- **Express.js** (v4.18.1) - Framework web
- **MongoDB** - Banco de dados NoSQL
- **JWT** (v9.0.0) - Autenticação
- **Swagger** - Documentação da API
- **Multer** - Upload de arquivos
- **CSV Parser** - Processamento de arquivos CSV
- **XML2JS** - Processamento de arquivos XML

## Estrutura do Projeto

```
SISPESQ-Backend/
├── api/                  # Código principal da API
│   ├── controllers/      # Controladores das rotas
│   ├── middleware/       # Middleware personalizado
│   ├── routes/          # Definição das rotas
│   └── server.js        # Arquivo principal do servidor
├── data-uploads/        # Diretório para uploads
├── public/              # Arquivos estáticos
├── xml_files/           # Arquivos XML processados
└── .env                 # Variáveis de ambiente
```

## Funcionalidades Principais

1. **Autenticação e Autorização**
   - Sistema de login com JWT
   - Proteção de rotas
   - Gerenciamento de tokens

2. **Gestão de Pesquisadores**
   - Cadastro e atualização de pesquisadores
   - Importação de dados via CSV
   - Integração com Lattes/CNPq

3. **Gestão Acadêmica**
   - Patentes
   - Softwares
   - Orientações
   - Produção científica

4. **Departamentos**
   - Gestão de departamentos acadêmicos
   - Relacionamento com pesquisadores

## Configuração do Ambiente

1. **Requisitos**
   - Node.js (v22.4.0)
   - MongoDB
   - npm ou yarn

2. **Instalação**
   ```bash
   # Instalar dependências
   npm install

   # Criar arquivo .env com as variáveis necessárias
   cp .env.example .env
   ```

3. **Variáveis de Ambiente**
   - `MONGO_URI`: URL de conexão com o MongoDB
   - `JWT_SECRET`: Chave secreta para JWT
   - `PORT`: Porta do servidor (padrão: 3000)

## Executando o Projeto

```bash
# Modo de desenvolvimento
npm run dev

# Modo de produção
npm start
```

## Documentação da API

A documentação completa da API está disponível em:

```
http://localhost:3000/api-docs
```

## Segurança

- Implementação de CORS
- Validação de dados e tipos
- Sanitização de inputs
- Proteção contra injeção de dados (XML, CSV)
- Rate limiting
- Autenticação JWT
- Validação de arquivos
- Limite de tamanho de arquivos
- Validação de extensões de arquivo permitidas

## Licença

ISC License
