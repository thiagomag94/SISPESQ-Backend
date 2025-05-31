const winston = require('winston');
const { format } = require('logform');
const { combine, timestamp, json, label, printf } = format;

// Configuração do logger
const logger = winston.createLogger({
    format: combine(
        timestamp(),
        json()
    ),
    transports: [
        // Transporte para arquivo de logs
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error'
        }),
        new winston.transports.File({
            filename: 'logs/combined.log'
        }),
        // Transporte para console (desenvolvimento)
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Middleware de logging
const requestLogger = (req, res, next) => {
    logger.info('Request', {
        method: req.method,
        url: req.url,
        body: req.body,
        query: req.query,
        params: req.params,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });
    next();
};

// Middleware de erro
const errorLogger = (error, req, res, next) => {
    logger.error('Error', {
        message: error.message,
        stack: error.stack,
        method: req.method,
        url: req.url,
        body: req.body,
        query: req.query,
        params: req.params,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });
    next(error);
};

module.exports = {
    logger,
    requestLogger,
    errorLogger
};
