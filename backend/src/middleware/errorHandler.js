/**
 * Error Handling Middleware
 */

const config = require('../config/env');

/**
 * Custom API Error class
 */
class ApiError extends Error {
    constructor(statusCode, message, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        error: 'Endpoint not found',
        code: 'NOT_FOUND',
        path: req.originalUrl
    });
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
    // Log error
    console.error('❌ Error:', err);

    // Handle known API errors
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            error: err.message,
            code: err.code
        });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: err.details || err.message
        });
    }

    // Handle database errors
    if (err.code) {
        // PostgreSQL error codes
        switch (err.code) {
            case '23505': // Unique violation
                return res.status(409).json({
                    error: 'Resource already exists',
                    code: 'DUPLICATE_ENTRY'
                });
            case '23503': // Foreign key violation
                return res.status(400).json({
                    error: 'Invalid reference',
                    code: 'INVALID_REFERENCE'
                });
            case '23502': // Not null violation
                return res.status(400).json({
                    error: 'Required field missing',
                    code: 'MISSING_REQUIRED_FIELD'
                });
        }
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expired',
            code: 'TOKEN_EXPIRED'
        });
    }

    // Default error response
    const statusCode = err.statusCode || 500;
    const message = config.NODE_ENV === 'production'
        ? 'An error occurred. Please try again later.'
        : err.message;

    res.status(statusCode).json({
        error: message,
        code: 'INTERNAL_ERROR',
        ...(config.NODE_ENV === 'development' && { stack: err.stack })
    });
};

/**
 * Async handler wrapper to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    ApiError,
    notFoundHandler,
    errorHandler,
    asyncHandler
};
