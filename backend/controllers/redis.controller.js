import axios from "axios";
export const getRedisStorage = async (req, res) => {
    const { key } = req.params; // Optional: specific key to view
    const { pattern } = req.query; // Optional: pattern to match keys
    
    try {
        let keys = [];
        
        // Get all keys or specific key
        if (key) {
            keys = [key];
        } else {
            // Get all keys - Upstash REST API doesn't have direct KEYS command
            // So we need to use SCAN or a workaround
            try {
                // Try to use SCAN (if supported by your Upstash plan)
                const scanResponse = await axios({
                    method: 'post',
                    url: `${process.env.UPSTASH_REDIS_REST_URL}`,
                    data: JSON.stringify([ 'SCAN', '0', 'MATCH', pattern || '*', 'COUNT', '100' ]),
                    headers: { 
                        'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (scanResponse.data && scanResponse.data.result) {
                    keys = scanResponse.data.result[1];
                }
            } catch (err) {
                // Fallback: Use KEYS command
                const keysResponse = await axios({
                    method: 'post',
                    url: `${process.env.UPSTASH_REDIS_REST_URL}`,
                    data: JSON.stringify([ 'KEYS', pattern || '*' ]),
                    headers: { 
                        'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (keysResponse.data && keysResponse.data.result) {
                    keys = keysResponse.data.result;
                }
            }
        }
        
        // Get values for all keys
        const storageData = {};
        
        for (const singleKey of keys) {
            try {
                const getResponse = await axios({
                    method: 'get',
                    url: `${process.env.UPSTASH_REDIS_REST_URL}/get/${singleKey}`,
                    headers: { 'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
                });
                
                if (getResponse.data.result) {
                    // Try to parse as JSON, otherwise keep as string
                    try {
                        storageData[singleKey] = JSON.parse(getResponse.data.result);
                    } catch {
                        storageData[singleKey] = getResponse.data.result;
                    }
                } else {
                    storageData[singleKey] = null;
                }
            } catch (err) {
                storageData[singleKey] = { error: err.message };
            }
        }
        
        // Get TTL for each key
        const ttls = {};
        for (const singleKey of keys) {
            try {
                const ttlResponse = await axios({
                    method: 'post',
                    url: `${process.env.UPSTASH_REDIS_REST_URL}`,
                    data: JSON.stringify([ 'TTL', singleKey ]),
                    headers: { 
                        'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                });
                ttls[singleKey] = ttlResponse.data.result;
            } catch (err) {
                ttls[singleKey] = null;
            }
        }
        
        res.json({
            success: true,
            total_keys: keys.length,
            keys: keys,
            data: storageData,
            ttls: ttls,
            timestamp: new Date().toISOString()
        });
        
    } catch (err) {
        console.error('Redis storage error:', err);
        res.status(500).json({ 
            success: false, 
            message: "Failed to get Redis storage",
            error: err.message 
        });
    }
};

export const deleteRedisKey = async (req, res) => {
    const { key } = req.params;
    
    if (!key) {
        return res.status(400).json({ 
            success: false, 
            message: "Key parameter is required" 
        });
    }
    
    try {
        const delResponse = await axios({
            method: 'post',
            url: `${process.env.UPSTASH_REDIS_REST_URL}`,
            data: JSON.stringify([ 'DEL', key ]),
            headers: { 
                'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        res.json({
            success: true,
            message: `Key "${key}" deleted`,
            deleted_count: delResponse.data.result
        });
        
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ 
            success: false, 
            message: "Failed to delete key",
            error: err.message 
        });
    }
};

export const flushRedis = async (req, res) => {
    // WARNING: This will delete ALL Redis data!
    const { confirm } = req.query;
    
    if (confirm !== 'yes') {
        return res.status(400).json({ 
            success: false, 
            message: "Must provide ?confirm=yes to flush all Redis data" 
        });
    }
    
    try {
        const flushResponse = await axios({
            method: 'post',
            url: `${process.env.UPSTASH_REDIS_REST_URL}`,
            data: JSON.stringify([ 'FLUSHALL' ]),
            headers: { 
                'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        res.json({
            success: true,
            message: "All Redis data flushed",
            result: flushResponse.data.result
        });
        
    } catch (err) {
        console.error('Flush error:', err);
        res.status(500).json({ 
            success: false, 
            message: "Failed to flush Redis",
            error: err.message 
        });
    }
};