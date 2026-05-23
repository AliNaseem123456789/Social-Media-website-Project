import redisClient from "../config/redis.config";

export const cacheMiddleware = (duration = 300, keyPrefix = null) => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Create cache key from URL + user ID (if authenticated)
        const userId = req.user?.id || 'public';
        const url = keyPrefix || req.originalUrl;
        const cacheKey = `cache:${userId}:${url}`;

        try {
            // Try to get from cache
            const cachedData = await redisClient.get(cacheKey);
            
            if (cachedData) {
                console.log(`✅ Cache HIT: ${cacheKey}`);
                return res.json(cachedData);
            }
            
            console.log(`❌ Cache MISS: ${cacheKey}`);
            
            // Store original send function
            const originalJson = res.json;
            
            // Override to cache response
            res.json = function(data) {
                redisClient.set(cacheKey, data, duration);
                originalJson.call(this, data);
            };
            
            next();
        } catch (error) {
            console.error('Cache middleware error:', error);
            next();
        }
    };
};

// Invalidate cache by pattern
export const invalidateCache = async (pattern) => {
    await redisClient.delPattern(pattern);
};