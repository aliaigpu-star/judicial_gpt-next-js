/**
 * Rate Limiting Middleware
 * Prevents abuse and protects against DDoS
 */

const rateLimit = require('express-rate-limit');
const config = require('../config/env');

/**
 * Get client identifier from request (used for IP-based limiting)
 */
const getIp = (req) => {
    // Try to get real IP behind proxy
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
};

/**
 * Global Rate Limiter
 */
const rateLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
    max: config.RATE_LIMIT_MAX_REQUESTS || 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getIp,
    skip: (req) => req.path === '/health',
    handler: (req, res, next, options) => {
        res.status(429).json({
            error: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(options.windowMs / 1000)
        });
    }
});

/**
 * Stricter rate limiter for auth endpoints
 */
const authRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getIp,
    handler: (req, res, next, options) => {
        res.status(429).json({
            error: 'Too many authentication attempts. Please try again later.',
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(options.windowMs / 1000)
        });
    }
});

/**
 * AI chat rate limiter (stricter)
 */
const aiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || getIp(req),
    handler: (req, res, next, options) => {
        res.status(429).json({
            error: 'Rate limit exceeded. Please wait before sending more messages.',
            code: 'AI_RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(options.windowMs / 1000)
        });
    }
});

module.exports = rateLimiter;
module.exports.authRateLimiter = authRateLimiter;
module.exports.aiRateLimiter = aiRateLimiter;
