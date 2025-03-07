

const criaArtigo = async (req, res) => {
    // Criar o artigo no banco de dados
    
    Artigos.create(artigoData)
    .then(artigo => {
    console.log('Artigo criado:', artigo);
    return artigo;  // Passar o artigo para o próximo passo
    })
    .catch(err => {
    console.error('Erro ao criar artigo:', err);
    });
    
  
}