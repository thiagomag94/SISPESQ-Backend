const mongoose = require('mongoose')
const {Schema} = mongoose
const bcrypt = require('bcryptjs');

const professoresSchema = new Schema({
    NOME:String,
    EMAIL_PRINCIPAL:String,
    EMAIL_SECUNDARIO:String,
    DEPARTAMENTO:String,
    CENTRO:String,
    LINHA_DE_PESQUISA:String
})

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        unique: true, 
        required:true
    },
    email: { 
        type: String, 
        unique: true,
        required:true
    },
    password: {
        type:String,
        required:true
    },
    isAdmin: {
        type: Boolean,
        default: false
      }
  });

// Antes de salvar, criptografar a senha com hash bcrypt
userSchema.pre('save', async function (next) {
    const user = this;
    if (user.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(user.password, salt);
      user.password = hash;
    }
    next();
  });

const professoresdb = mongoose.model('Professores', professoresSchema)
const usersdb = mongoose.model('Users', userSchema)

module.exports = {professoresdb, usersdb}