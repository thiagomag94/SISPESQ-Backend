
const express = require('express');
const app = express()
const register = express.Router();
const checkToken = require('../controllers/Auth');
const {usersdb} = require('../db')
const bcrypt = require('bcryptjs');
const { secretKey } = require('../config');
const jwt = require('jsonwebtoken');
const cors = require('cors')


//permitir o uso do req.body
app.use(express.json())


//Permitir requisições cruzadas//

//Permitir requisições cruzadas//
// Middleware de CORS


// rotas de cadastro e login



register.post('/signup', async(req, res) =>{
    const {name, email, password, confirmPassword, isAdmin} = req.body
    
    console.log(name)
    console.log(password)

    if (!name){
        res.json({message:"username is required"})

    }
    if (!email){
        res.json({message:"email is required"})
    }
    if (!password){
        res.json({message:"password is required"})
    }

    

    userExists = await usersdb.findOne({email:email})

    if (userExists){
        res.json({message: "User already exists"})
    }

    if (password !== confirmPassword){
        res.json({message:"Passwords don't match"})
    }else{
        try{
            const newUser = new usersdb({
                name:name,
                email:email,
                password:password,
                isAdmin:isAdmin
            })
    
            
    
            newUser.save((err, result)=>{
                if (err){
                    console.log(err)
                }
                res.status(201).json({message:"inserted on database", result:result})
                })
            
        }catch(err){
            res.json({error:err, message:"Something went wrong. Try again later"})
        }
    }
    
})

register.post('/login', async(req,res)=>{
    const {email, password} = req.body

    //validation

    if (!email){
        res.json({message:"email is required"})
    }

    if (!password){
        res.json({message:"password is required"})
    }

    const user = await usersdb.findOne({email:email})

    if (!user){
        res.status(401).json({message: "User not found"})
    } else if(user.password){

        //check if password match

        const checkPassword = await bcrypt.compare(password, user.password)
        console.log(checkPassword)

        if (checkPassword){
            
            try{
                const secret = secretKey
                const token = jwt.sign(
                    {
                        id:user._id,
                        name:user.name,
                        email:user.email,
                        isAdmin:user.isAdmin


                    },
                    secret,
                )
                console.log(secret)
                console.log(token)
                res.status(200).json({message:"Authentication was successfully done", token, user})
            }catch(error){
                res.status(500).json({error:error, message:"Something went wrong. Try again later"})
            } 
        } else{
            res.status(401).json({message: "Password invalid"})
        }

    }
})

//private routes
register.delete('delete/:id', checkToken,  async(req, res)=>{
    
    userId = req.params.id
    isAdmin = req.body.isAdmin
    
    try{
        
        if(isAdmin){
            usersdb.findByIdAndDelete(userId, (err, result) =>{
                if (err){
                    res.status(500).json({ msg: 'Internal server error', error:err})
                }
                else{
                    res.status(200).json({message:"usuário deletado", result:result})
                }
            } )
        }
        else{
            res.status(401).json({msg:"user doesn't have access right to delete other user"})
        }
        

    }catch(error){
        res.status(500).json({ error: 'Internal server error'})
    }
})



register.get('/', checkToken, async(req, res)=>{
    try{
        const resultQuery = await usersdb.find()
        res.status(200).json({result:resultQuery})

    }catch(err){
        res.status(500).json({ error: 'Internal server error'})
    }
})


register.get('/:id', checkToken,  async(req, res) =>{
    const id = req.params.id

    //check if user exists
    try{
        const user = await usersdb.findById(id, '-password')
        console.log(user)

        if (!user || user === undefined){
            res.status(404).json({message: "Usuário não encontrado"})
        }

        res.status(200).json({msg:"Redirecionado para rota privada", user})

    }catch(error){
        res.status(500).json({ error: 'Internal server error'})
    }
    
})



module.exports = register