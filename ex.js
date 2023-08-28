try{
    //inclui efetivamente o professor se já não estiver no banco
    novoProfessor.save((err, result)=>{
    res.status(200).json({message:result})
    })

}catch(error){
    //
    res.status(500).send(error, "Desculpe, nossos servidores estão um pouco sobrecarregados. Tente mais tarde.")
}