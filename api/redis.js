const Redis = require('ioredis');
const dotenv = require('dotenv');
dotenv.config();

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || null,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
};

let redis;

redis = new Redis(redisConfig);
redis.on('ready', () => {
    console.log('Redis connected');
});
redis.on('error', (error) => {
    console.error('Redis connection error:', error);
});


   


module.exports = redis;
