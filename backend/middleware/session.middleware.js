// middleware/session.middleware.js - FULLY CORRECTED

import crypto from 'crypto';
import Redis from "ioredis";

const redis = new Redis("rediss://default:gQAAAAAAAffMAAIgcDJlNzNmNzUxZDVhNDk0MGJlYjdkNDVhNjQ1MDU5Y2U4ZQ@humorous-troll-128972.upstash.io:6379");

redis.on('connect', () => console.log('✅ Session Redis connected'));
redis.on('error', (err) => console.error('❌ Session Redis error:', err));  // ✅ UNCOMMENTED

function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    
    cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
            cookies[name] = value;
        }
    });
    return cookies;
}

async function saveSessionToRedis(sessionId, sessionData, ttlSeconds = 86400) {
    const key = `session:${sessionId}`;
    const value = JSON.stringify(sessionData);
    await redis.setex(key, ttlSeconds, value);
    console.log(`💾 Session saved: ${sessionId}`);
}

async function getSessionFromRedis(sessionId) {
    const key = `session:${sessionId}`;
    const data = await redis.get(key);
    if (data) {
        return JSON.parse(data);
    }
    return null;
}

async function deleteSessionFromRedis(sessionId) {
    const key = `session:${sessionId}`;
    await redis.del(key);
    console.log(`🗑️ Session deleted: ${sessionId}`);
}

export const sessionMiddleware = async (req, res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    let sessionId = cookies.sessionId;
    
    // Initialize req.session
    req.session = null;
    
    // Load existing session
    if (sessionId) {
        const sessionData = await getSessionFromRedis(sessionId);
        if (sessionData) {
            req.session = sessionData;
            req.session.id = sessionId;
            console.log(`✅ Session loaded: ${sessionId} for user ${sessionData.userId}`);
        } else {
            console.log(`⚠️ Invalid session: ${sessionId}`);
        }
    }
    
    const originalEnd = res.end;
    
    res.end = function(...args) {
        const needsSave = req.session && req.session.userId && req.session._needsSave === true;
        
        if (needsSave) {
            // ✅ FIXED: Generate ID if not present
            if (!req.session.id) {
                req.session.id = generateSessionId();
                console.log(`🆕 Generated new session ID: ${req.session.id}`);
            }
            
            const saveSessionId = req.session.id;
            const sessionToSave = { ...req.session };
            delete sessionToSave.id;
            delete sessionToSave._needsSave;
            
            saveSessionToRedis(saveSessionId, sessionToSave, 86400).catch(err => {
                console.error('Failed to save session:', err);
            });
            
            // Set cookie if new or changed
            if (!sessionId || saveSessionId !== sessionId) {
                const isProduction = process.env.NODE_ENV === 'production';
               res.setHeader('Set-Cookie', `sessionId=${saveSessionId}; HttpOnly; Path=/; Max-Age=86400; SameSite=none; Secure`);
            // Development only
            // res.setHeader('Set-Cookie', `sessionId=${saveSessionId}; HttpOnly; Path=/; Max-Age=86400; SameSite=lax`);
            //     console.log(`🍪 Set cookie: sessionId=${saveSessionId}`);
            // }
            
            req.session._needsSave = false;
        } else if ((!req.session || !req.session.userId) && sessionId) {
            res.setHeader('Set-Cookie', 'sessionId=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
            console.log(`🗑️ Cleared invalid cookie: ${sessionId}`);
        }
        
        originalEnd.apply(res, args);
    };
    
    next();
};

// ✅ FIXED: createSession now sets an ID
export const createSession = (req, user) => {
    const sessionId = generateSessionId();
    req.session = {
        id: sessionId,
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        loginTime: Date.now(),
        _needsSave: true
    };
    console.log(`🆕 Created session: ${sessionId} for user ${user.id} (${user.username})`);
};

export const updateSession = (req, updates) => {
    if (req.session) {
        Object.assign(req.session, updates);
        req.session._needsSave = true;
    }
};

export const destroySession = async (req, res) => {
    if (req.session && req.session.id) {
        await deleteSessionFromRedis(req.session.id);
        req.session = null;
    }
    res.setHeader('Set-Cookie', 'sessionId=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
};

export const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please login.',
            code: 'UNAUTHORIZED'
        });
    }
    next();
};

export const optionalAuth = (req, res, next) => {
    next();
};