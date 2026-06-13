import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class RedisClient {
    constructor() {
        this.restUrl = process.env.UPSTASH_REDIS_REST_URL;
        this.restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
        this.isConnected = false;
    }

    async connect() {
        if (!this.restUrl || !this.restToken) {
            console.error('❌ Redis credentials missing in .env');
            return false;
        }
        
        try {
            const response = await axios({
                method: 'post',
                url: `${this.restUrl}/ping`,
                data: {},
                headers: { 'Authorization': `Bearer ${this.restToken}` }
            });
            
            if (response.status === 200) {
                this.isConnected = true;
                console.log('✅ Upstash Redis connected!');
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Redis connection failed:', error.message);
            return false;
        }
    }

    // FIXED: Returns the actual value, not wrapped
    // config/redis.config.js - COMPLETELY FIXED VERSION

async get(key) {
    if (!this.isConnected) return null;
    try {
        const response = await axios({
            method: 'get',
            url: `${this.restUrl}/get/${key}`,
            headers: { 'Authorization': `Bearer ${this.restToken}` }
        });
        
        // Log raw response for debugging
        console.log('📥 RAW Redis response:', JSON.stringify(response.data).substring(0, 200));
        
        if (response.data.result === null) return null;
        
        // Parse the result - it's a JSON string
        let parsed;
        try {
            parsed = JSON.parse(response.data.result);
            console.log('✅ Parsed successfully, username:', parsed.username);
            return parsed;
        } catch (e) {
            console.log('❌ Parse error:', e.message);
            return response.data.result;
        }
    } catch (error) {
        console.error('GET error:', error.message);
        return null;
    }
}

async set(key, value, ttlSeconds = 300) {
    if (!this.isConnected) return false;
    try {
        // Log what we're storing
        console.log('📤 Storing to Redis, username:', value.username);
        
        // Convert to string
        const stringValue = JSON.stringify(value);
        
        const response = await axios({
            method: 'post',
            url: `${this.restUrl}/set/${key}`,
            data: { value: stringValue, ex: ttlSeconds },
            headers: { 
                'Authorization': `Bearer ${this.restToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📤 Store response:', response.data);
        return response.data.result === 'OK';
    } catch (error) {
        console.error('SET error:', error.message);
        return false;
    }
}
    async del(key) {
        if (!this.isConnected) return false;
        try {
            await axios({
                method: 'post',
                url: `${this.restUrl}/del/${key}`,
                data: {},
                headers: { 'Authorization': `Bearer ${this.restToken}` }
            });
            return true;
        } catch (error) {
            console.error('DEL error:', error.message);
            return false;
        }
    }

    async delPattern(pattern) {
        if (!this.isConnected) return false;
        try {
            const response = await axios({
                method: 'get',
                url: `${this.restUrl}/keys/${pattern}`,
                headers: { 'Authorization': `Bearer ${this.restToken}` }
            });
            const keys = response.data.result || [];
            for (const key of keys) {
                await this.del(key);
            }
            console.log(`🗑️ Deleted ${keys.length} keys matching: ${pattern}`);
            return true;
        } catch (error) {
            console.error('delPattern error:', error.message);
            return false;
        }
    }

    async flushAll() {
        if (!this.isConnected) return false;
        try {
            await axios({
                method: 'post',
                url: `${this.restUrl}/flushall`,
                data: {},
                headers: { 'Authorization': `Bearer ${this.restToken}` }
            });
            console.log('🗑️ Redis FLUSHALL executed');
            return true;
        } catch (error) {
            console.error('FLUSHALL error:', error.message);
            return false;
        }
    }
    async saveSession(sessionId, userData, ttlSeconds = 86400) {  // 24 hours default
        const key = `session:${sessionId}`;
        return await this.set(key, userData, ttlSeconds);
    }

    // Get session data
    async getSession(sessionId) {
        const key = `session:${sessionId}`;
        return await this.get(key);
    }

    // Delete session
    async deleteSession(sessionId) {
        const key = `session:${sessionId}`;
        return await this.del(key);
    }

    // Check if session exists
    async sessionExists(sessionId) {
        const key = `session:${sessionId}`;
        const session = await this.get(key);
        return session !== null;
    }

    // Update session TTL (extend expiry on activity)
    async touchSession(sessionId, ttlSeconds = 86400) {
        // With Upstash REST API, we need to re-set with same data
        const session = await this.getSession(sessionId);
        if (session) {
            return await this.saveSession(sessionId, session, ttlSeconds);
        }
        return false;
    }

    async getStats() {
        return { hits: 0, misses: 0, hitRate: 0 };
    }
}

const redisClient = new RedisClient();
export default redisClient;