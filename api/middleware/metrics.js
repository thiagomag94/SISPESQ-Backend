let requestCount = 0;
let activeRequests = 0;

// Middleware para contar requisições
const metricsMiddleware = (req, res, next) => {
    requestCount++;
    activeRequests++;
    
    res.on('finish', () => {
        activeRequests--;
    });
    
    next();
};

// Função para obter métricas
const getMetrics = () => ({
    requests: requestCount,
    active: activeRequests,
    timestamp: new Date().toISOString()
});

module.exports = {
    metricsMiddleware,
    getMetrics
};
