require('dotenv').config();


module.exports = {
  port: process.env.PORT || 3000, // Porta em que o servidor irá rodar (usando a variável de ambiente PORT, se disponível)
  //databaseUrl: `mongodb+srv://${process.env.DB_USER}:${process.env.DB_password}@databaseufpe.xpguxkd.mongodb.net/?retryWrites=true&w=majority`, // URL do banco de dados (usando a variável de ambiente MONGODB_URI, se disponível)
  MONGO_URI: `mongodb://${process.env.DB_USER_DROP}:${encodeURIComponent(process.env.DB_PASSWORD_DROP)}@localhost:27018/test?authSource=admin&retryWrites=true`,
  secretKey: process.env.SECRET_KEY, // Chave secreta para a geração de tokens JWT (usando a variável de ambiente SECRET_KEY, se disponível)
};