# Documentação Técnica - SISPESQ Backend

## Arquitetura

### Estrutura de Pastas

```
api/
├── controllers/     # Lógica de negócios
│   ├── ResearcherController.js
│   ├── LattesController.js
│   └── UploadController.js
├── middleware/     # Middleware personalizado
│   └── cors.js
├── routes/         # Rotas da API
│   ├── Professores(old).js
│   ├── Authorize.js
│   ├── Departments.js
│   ├── Researchers.js
│   ├── Lattes.js
│   ├── Patentes.js
│   ├── Softwares.js
│   ├── Orientacoes.js
│   └── Produção.js
├── config.js       # Configurações do sistema
└── server.js       # Configuração do servidor
```

### Banco de Dados

- **MongoDB** como banco principal
- **Mongoose** como ODM (Object Data Modeling)
- Collections principais:
  - `researchers` - Dados dos pesquisadores
  - `departments` - Departamentos acadêmicos
  - `patentes` - Patentes registradas
  - `softwares` - Softwares desenvolvidos
  - `orientacoes` - Orientações acadêmicas
  - `producao` - Produção científica

### Segurança

1. **Autenticação**
   - JWT (JSON Web Tokens)
   - Rota de login protegida
   - Tokens com tempo de expiração

2. **CORS**
   - Middleware personalizado
   - Configuração por ambiente
   - White-list de domínios

3. **Validação de Dados**
   - Schema validation com Mongoose
   - Sanitização de inputs
   - Validação de arquivos uploadados

### Processamento de Dados

1. **CSV**
   - Leitura e processamento de arquivos CSV
   - Importação em massa de dados
   - Validação de formato

2. **XML**
   - Integração com Lattes/CNPq
   - Processamento de arquivos XML
   - Extração de metadados

### Upload de Arquivos

- Suporte para múltiplos uploads
- Validação de tipos de arquivos
- Gerenciamento de diretórios
- Limite de tamanho de arquivos

### APIs Externas

1. **Lattes/CNPq**
   - Integração com base de dados Lattes
   - Sincronização automática
   - Backup de dados

2. **APIs de Produção**
   - Patentes
   - Softwares
   - Produção científica
   - Orientações

### Monitoramento e Logs

- Logs de erros
- Logs de acesso
- Backup de dados falhados
- Monitoramento de performance

## Melhores Práticas Implementadas

1. **Segurança**
   - Rate limiting
   - Proteção contra SQL injection
   - Validação de headers
   - Sanitização de inputs

2. **Performance**
   - Pool de conexões MongoDB
   - Cache de rotas estáticas
   - Otimização de queries

3. **Manutenibilidade**
   - Código modular
   - Separação de responsabilidades
   - Documentação completa
   - Testes unitários

4. **Escalabilidade**
   - Arquitetura RESTful
   - Middleware reutilizável
   - Configuração por ambiente
   - Balanceamento de carga pronto

## Considerações Finais

Este backend foi desenvolvido seguindo as melhores práticas de desenvolvimento web, com foco em segurança, performance e manutenibilidade. A documentação completa da API está disponível através do Swagger em `/api-docs`.
