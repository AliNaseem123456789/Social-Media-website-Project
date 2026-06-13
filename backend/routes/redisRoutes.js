import express from 'express';
import {
    getRedisStorage,
    deleteRedisKey,
    flushRedis,
    getRedisStats,
    debugRedisKey,
    clearAllCache
} from '../controllers/redis.controller.js';

const router = express.Router();

// Routes (all public, no authentication required)
router.get('/stats', getRedisStats);
router.get('/keys', getRedisStorage);
router.get('/keys/:key', getRedisStorage);
router.get('/debug/:key', debugRedisKey);
router.delete('/keys/:key', deleteRedisKey);
router.delete('/cache-all', clearAllCache);
router.delete('/flush', flushRedis);

export default router;