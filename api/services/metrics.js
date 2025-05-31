const promClient = require('prom-client');

// Métricas de requisições
const httpRequestDurationMicroseconds = new promClient.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 5, 15, 50, 100, 500] // buckets in ms
});

const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

const activeRequests = new promClient.Gauge({
    name: 'active_requests',
    help: 'Number of active requests'
});

// Middleware para coletar métricas
const metricsMiddleware = (req, res, next) => {
    const start = process.hrtime();
    activeRequests.inc();

    res.on('finish', () => {
        const diff = process.hrtime(start);
        const duration = diff[0] * 1e3 + diff[1] * 1e-6; // Convert to milliseconds
        
        httpRequestDurationMicroseconds
            .labels(req.method, req.path, res.statusCode)
            .observe(duration);

        httpRequestsTotal
            .labels(req.method, req.path, res.statusCode)
            .inc();

        activeRequests.dec();
    });

    next();
};

// Endpoint para Prometheus
const metricsEndpoint = async (req, res) => {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
};

module.exports = {
    metricsMiddleware,
    metricsEndpoint,
    httpRequestsTotal,
    httpRequestDurationMicroseconds,
    activeRequests
};
