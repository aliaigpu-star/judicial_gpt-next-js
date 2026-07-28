/**
 * Rate Limiting Middleware
 * Prevents abuse and protects against DDoS
 */

const config = require('../config/env');

// In-memory store (use Redis for production clusters)
const rateLimitStore = new Map();

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (now - data.windowStart > config.RATE_LIMIT_WINDOW_MS * 2) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Get client identifier from request
 */
const getClientId = (req) => {
    // Try to get real IP behind proxy
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
};

/**
 * Rate limiting middleware
 */
const rateLimiter = (req, res, next) => {
    // Skip rate limiting for health checks
    if (req.path === '/health') {
        return next();
    }

    const clientId = getClientId(req);
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(clientId);

    if (!entry || now - entry.windowStart > config.RATE_LIMIT_WINDOW_MS) {
        // Start new window
        entry = {
            windowStart: now,
            requestCount: 0
        };
    }

    entry.requestCount++;
    rateLimitStore.set(clientId, entry);

    // Calculate remaining requests
    const remaining = Math.max(0, config.RATE_LIMIT_MAX_REQUESTS - entry.requestCount);
    const resetTime = Math.ceil((entry.windowStart + config.RATE_LIMIT_WINDOW_MS - now) / 1000);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.RATE_LIMIT_MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    // Check if limit exceeded
    if (entry.requestCount > config.RATE_LIMIT_MAX_REQUESTS) {
        return res.status(429).json({
            error: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: resetTime
        });
    }

    next();
};

/**
 * Stricter rate limiter for auth endpoints
 */
const authRateLimiter = (req, res, next) => {
    const clientId = `auth:${getClientId(req)}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 10; // 10 auth attempts per minute

    let entry = rateLimitStore.get(clientId);

    if (!entry || now - entry.windowStart > windowMs) {
        entry = {
            windowStart: now,
            requestCount: 0
        };
    }

    entry.requestCount++;
    rateLimitStore.set(clientId, entry);

    if (entry.requestCount > maxRequests) {
        const resetTime = Math.ceil((entry.windowStart + windowMs - now) / 1000);
        return res.status(429).json({
            error: 'Too many authentication attempts. Please try again later.',
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
            retryAfter: resetTime
        });
    }

    next();
};

/**
 * AI chat rate limiter (stricter)
 */
const aiRateLimiter = (req, res, next) => {
    const userId = req.user?.id || getClientId(req);
    const clientId = `ai:${userId}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 20; // 20 AI requests per minute

    let entry = rateLimitStore.get(clientId);

    if (!entry || now - entry.windowStart > windowMs) {
        entry = {
            windowStart: now,
            requestCount: 0
        };
    }

    entry.requestCount++;
    rateLimitStore.set(clientId, entry);

    const remaining = Math.max(0, maxRequests - entry.requestCount);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (entry.requestCount > maxRequests) {
        const resetTime = Math.ceil((entry.windowStart + windowMs - now) / 1000);
        return res.status(429).json({
            error: 'Rate limit exceeded. Please wait before sending more messages.',
            code: 'AI_RATE_LIMIT_EXCEEDED',
            retryAfter: resetTime
        });
    }

    next();
};

module.exports = rateLimiter;
module.exports.authRateLimiter = authRateLimiter;
module.exports.aiRateLimiter = aiRateLimiter;
