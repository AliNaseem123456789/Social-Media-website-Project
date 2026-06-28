import redisClient from "../config/redis.config.js";

/**
 * Get Redis storage info (all keys or specific key)
 * @route GET /api/redis/keys
 * @route GET /api/redis/keys/:key
 */
export const getRedisStorage = async (req, res) => {
  try {
    const { key } = req.params;
    
    if (key) {
      // Get specific key
      const value = await redisClient.get(key);
      return res.json({
        success: true,
        key,
        value: value !== null ? value : null,
        exists: value !== null
      });
    } else {
      // Get all keys (be careful with production)
      // Note: KEYS command is O(N) - use with caution
      // Consider using SCAN for production
      const keys = await redisClient.keys('*');
      const keyValues = {};
      
      for (const k of keys) {
        keyValues[k] = await redisClient.get(k);
      }
      
      return res.json({
        success: true,
        keyCount: keys.length,
        keys: keyValues
      });
    }
  } catch (error) {
    console.error('Redis get error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete specific Redis key
 * @route DELETE /api/redis/keys/:key
 */
export const deleteRedisKey = async (req, res) => {
  try {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Key parameter is required'
      });
    }
    
    const deletedCount = await redisClient.del(key);
    
    if (deletedCount > 0) {
      return res.json({
        success: true,
        message: `Key "${key}" deleted successfully`,
        deleted: true
      });
    } else {
      return res.status(404).json({
        success: false,
        message: `Key "${key}" not found`,
        deleted: false
      });
    }
  } catch (error) {
    console.error('Redis delete error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Flush ALL Redis data (use with extreme caution!)
 * @route DELETE /api/redis/flush
 */
export const flushRedis = async (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const confirmHeader = req.headers['x-confirm-flush'];
    
    if (isProduction && confirmHeader !== 'confirm-destructive-action') {
      return res.status(403).json({
        success: false,
        error: 'Destructive action requires confirmation header: x-confirm-flush: confirm-destructive-action'
      });
    }
    
    await redisClient.flushAll();
    
    return res.json({
      success: true,
      message: 'All Redis data flushed successfully',
      warning: 'This action cannot be undone'
    });
  } catch (error) {
    console.error('Redis flush error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get Redis cache stats
 * @route GET /api/redis/stats
 */
export const getRedisStats = async (req, res) => {
  try {
    const info = await redisClient.info();
    const memory = await redisClient.info('memory');
    const stats = await redisClient.info('stats');
    
    // Parse Redis INFO command output
    const parseRedisInfo = (infoString) => {
      const result = {};
      const lines = infoString.split('\n');
      for (const line of lines) {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value) {
            result[key] = value;
          }
        }
      }
      return result;
    };
    
    const parsedInfo = parseRedisInfo(info);
    const parsedMemory = parseRedisInfo(memory);
    const parsedStats = parseRedisInfo(stats);
    
    // Get keys count
    const keys = await redisClient.keys('*');
    
    const cacheStats = {
      connected: redisClient.isConnected,
      redis_version: parsedInfo.redis_version,
      uptime_seconds: parsedInfo.uptime_in_seconds,
      connected_clients: parsedInfo.connected_clients,
      used_memory_human: parsedMemory.used_memory_human,
      total_keys: keys.length,
      total_commands_processed: parsedStats.total_commands_processed,
      hit_rate: await redisClient.get('cache:hitRate') || 'Not tracked',
      status: redisClient.isConnected ? 'connected' : 'disconnected'
    };
    
    return res.json({
      success: true,
      ...cacheStats,
      message: cacheStats.hitRate > 70 ? 'Excellent cache performance!' : 'Cache hit rate can be improved'
    });
  } catch (error) {
    console.error('Redis stats error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Debug endpoint - inspect specific Redis key with raw data
 * @route GET /api/redis/debug/:key
 */
export const debugRedisKey = async (req, res) => {
  try {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Key parameter is required'
      });
    }
    
    const rawValue = await redisClient.get(key);
    let parsedValue = null;
    
    // Try to parse JSON if it's a string
    if (typeof rawValue === 'string') {
      try {
        parsedValue = JSON.parse(rawValue);
      } catch (e) {
        parsedValue = rawValue;
      }
    }
    
    // Get key type and TTL
    const keyType = await redisClient.type(key);
    const ttl = await redisClient.ttl(key);
    
    return res.json({
      success: true,
      key,
      type: keyType,
      ttl: ttl > 0 ? `${ttl} seconds` : (ttl === -1 ? 'no expiration' : 'expired/not exists'),
      rawValue: rawValue !== null ? rawValue : null,
      parsedValue: parsedValue !== null ? parsedValue : null,
      exists: rawValue !== null,
      size: rawValue ? JSON.stringify(rawValue).length : 0
    });
  } catch (error) {
    console.error('Redis debug error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Clear all cache (alias for flush)
 * @route DELETE /api/redis/cache-all
 */
export const clearAllCache = async (req, res) => {
  try {
    await redisClient.flushAll();
    return res.json({ 
      success: true, 
      message: 'All cache cleared successfully' 
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};