import redisClient from "../config/redis.config";

export const cacheMiddleware = (duration = 300, keyPrefix = null) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }
        const userId = req.user?.id || 'public';
        const url = keyPrefix || req.originalUrl;
        const cacheKey = `cache:${userId}:${url}`;

        try {
            const cachedData = await redisClient.get(cacheKey);
            
            if (cachedData) {
                console.log(`Cache HIT: ${cacheKey}`);
                return res.json(cachedData);
            }
            console.log(`Cache MISS: ${cacheKey}`);            
            const originalJson = res.json;            
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

export const invalidateCache = async (pattern) => {
    await redisClient.delPattern(pattern);
};