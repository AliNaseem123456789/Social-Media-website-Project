import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const securityHeaders = (isProduction = false) => {
    return helmet({
        contentSecurityPolicy: isProduction ? {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https://yourdomain.com", "http://localhost:5000"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
            },
        } : false,          
        hsts: isProduction ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        } : false,        
        frameguard: { action: 'deny' },
        noSniff: true,
        xssFilter: true,
        hidePoweredBy: true,
    });
};

export const corsConfig = (isProduction = false) => {
    const allowedOrigins = isProduction 
        ? ['https://yourdomain.com', 'https://api.yourdomain.com']
        : ['http://localhost:3000', 'http://localhost:5000'];
    
    return {
        origin: function(origin, callback) {
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) !== -1 || !isProduction) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
        exposedHeaders: ['Set-Cookie'],
        maxAge: 86400
    };
};
export const rateLimiters = {
    general: rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: {
            success: false,
            message: 'Too many requests, please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => req.ip || req.connection.remoteAddress
    }),
    
    auth: rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: {
            success: false,
            message: 'Too many login attempts. Please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true,
    }),
    
    sensitive: rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 10,
        message: {
            success: false,
            message: 'Too many attempts. Please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
    })
};

export const customSecurityHeaders = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');    
    res.removeHeader('X-Powered-By');
    
    next();
};
export const preventParameterPollution = (req, res, next) => {
    const rawQuery = req.url.split('?')[1];
    if (rawQuery) {
        const params = rawQuery.split('&');
        const paramCount = {};
        
        for (const param of params) {
            const [key] = param.split('=');
            paramCount[key] = (paramCount[key] || 0) + 1;
            if (paramCount[key] > 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Duplicate parameters are not allowed',
                    code: 'INVALID_REQUEST'
                });
            }
        }
    }
    next();
};
export const sessionSecurityHeaders = (req, res, next) => {
    res.setHeader('X-Session-ID-Header', 'disabled');
    next();
};

