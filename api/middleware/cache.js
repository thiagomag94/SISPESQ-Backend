const cache = require('memory-cache');
const { promisify } = require('util');

// Cache com TTL de 1 hora
const cacheStore = new cache.Cache();
const getCache = promisify(cacheStore.get).bind(cacheStore);
const setCache = promisify(cacheStore.put).bind(cacheStore);

// Middleware de cache
const cacheMiddleware = async (req, res, next) => {
    const { method, url, query } = req;
    
    // Não cacheia POST, PUT, DELETE
    if (method !== 'GET') return next();
    
    // Gerar chave única para o cache
    const cacheKey = `${method}:${url}:${JSON.stringify(query)}`;
    
    try {
        // Verificar se existe no cache
        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            res.json(cachedData);
            return;
        }
        
        // Continuar para o próximo middleware
        req.cacheKey = cacheKey;
        next();
    } catch (error) {
        next(error);
    }
};

// Middleware de cache para resposta
const cacheResponse = async (req, res, next) => {
    if (!req.cacheKey) return next();
    
    // Salvar resposta no cache
    const data = res._data || res.body;
    if (data) {
        await setCache(req.cacheKey, data, 3600000); // 1 hora em ms
    }
    
    next();
};

module.exports = {
    cacheMiddleware,
    cacheResponse
};
