/**
 * Authentication Middleware
 * JWT verification and user extraction
 */

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { query } = require('../config/database');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from header or cookie
        let token = null;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'NO_TOKEN'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, config.JWT_SECRET);

        // Get user from database
        const result = await query(
            `SELECT u.id, u.email, u.email_verified, up.name, up.role, up.status, up.avatar_url, up.preferences
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.id
       WHERE u.id = $1`,
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = result.rows[0];

        // Check if user is active
        if (user.status === 'suspended' || user.status === 'banned') {
            return res.status(403).json({
                error: 'Account is suspended',
                code: 'ACCOUNT_SUSPENDED'
            });
        }

        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || 'user',
            status: user.status || 'active',
            emailVerified: user.email_verified,
            avatarUrl: user.avatar_url,
            preferences: user.preferences
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }

        console.error('Authentication error:', error);
        return res.status(500).json({
            error: 'Authentication failed',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
    try {
        let token = null;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);

        const result = await query(
            `SELECT u.id, u.email, up.name, up.role, up.status
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.id
       WHERE u.id = $1`,
            [decoded.userId]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            req.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role || 'user',
                status: user.status || 'active'
            };
        } else {
            req.user = null;
        }

        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

/**
 * Require admin role
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required',
            code: 'NO_AUTH'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Admin access required',
            code: 'ADMIN_REQUIRED'
        });
    }

    next();
};

/**
 * Require email verification
 */
const requireVerifiedEmail = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required',
            code: 'NO_AUTH'
        });
    }

    if (!req.user.emailVerified) {
        return res.status(403).json({
            error: 'Email verification required',
            code: 'EMAIL_NOT_VERIFIED'
        });
    }

    next();
};

module.exports = {
    authenticate,
    optionalAuth,
    requireAdmin,
    requireVerifiedEmail
};
