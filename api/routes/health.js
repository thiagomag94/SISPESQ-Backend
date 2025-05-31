const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { getMetrics } = require('../middleware/metrics');

// Health check básico
router.get('/health', async (req, res) => {
    try {
        // Verifica conexão com MongoDB
        const dbStatus = mongoose.connection.readyState === 1;
        
        // Verifica memória
        const memory = process.memoryUsage();
        const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;
        const metrics = getMetrics();
        
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            db: {
                status: dbStatus ? 'connected' : 'disconnected',
                readyState: mongoose.connection.readyState
            },
            memory: {
                used: memory.heapUsed,
                total: memory.heapTotal,
                percent: memoryUsagePercent
            },
            metrics: {
                requests: metrics.requests,
                active: metrics.active
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            error: error.message
        });
    }
});

// Health check detalhado
router.get('/health/detailed', async (req, res) => {
    try {
        // Verifica conexão com MongoDB
        const dbStatus = mongoose.connection.readyState === 1;
        
        // Verifica memória
        const memory = process.memoryUsage();
        const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            db: {
                status: dbStatus ? 'connected' : 'disconnected',
                readyState: mongoose.connection.readyState,
                collections: mongoose.connection.collections
            },
            memory: {
                used: memory.heapUsed,
                total: memory.heapTotal,
                percent: memoryUsagePercent,
                rss: memory.rss,
                external: memory.external
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            error: error.message
        });
    }
});

module.exports = router;
