/**
 * Authentication Routes
 * Handles user registration, login, logout, and session management
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimit');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const config = require('../config/env');
const ActivityLogger = require('../services/activityLogger');
const emailService = require('../services/emailService');
const { query } = require('../config/database');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

// Google OAuth Client
console.log('🔑 Initializing Google OAuth Client with:');
console.log('   Client ID:', config.GOOGLE_CLIENT_ID);
console.log('   Client Secret:', config.GOOGLE_CLIENT_SECRET ? `...${config.GOOGLE_CLIENT_SECRET.slice(-4)}` : 'MISSING');
console.log('   Callback URL:', config.GOOGLE_CALLBACK_URL);

const googleClient = new OAuth2Client(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_CALLBACK_URL
);

// Helper for Turnstile verification
// Helper for Turnstile verification
const verifyTurnstile = async (token, ip) => {
    let secretKey = config.TURNSTILE_SECRET_KEY;

    if (config.NODE_ENV === 'development') {
        console.log('🔧 Development Mode: Bypassing Turnstile Verification to allow login.');
        return true;
    }

    // If no secret key is set (and not in dev), warn and skip
    if (!secretKey) {
        console.warn('⚠️ Turnstile secret key missing. Skipping verification.');
        return true;
    }

    if (!token) {
        if (config.NODE_ENV === 'development') {
            console.warn('⚠️ Turnstile token missing in development. Bypassing check.');
            return true;
        }
        return false;
    }

    try {
        const formData = new URLSearchParams();
        formData.append('secret', secretKey);
        formData.append('response', token);
        formData.append('remoteip', ip);

        const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            body: formData,
            method: 'POST',
        });

        const outcome = await result.json();

        if (!outcome.success) {
            console.error('❌ Turnstile verification failed:', outcome['error-codes']);
        }

        return outcome.success;
    } catch (e) {
        console.error('Turnstile verification error:', e);
        return false;
    }
};

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
router.get('/google', (req, res) => {
    console.log('🔄 Google Auth Route Hit');
    console.log('🔑 Active Client ID:', config.GOOGLE_CLIENT_ID);

    const authorizeUrl = googleClient.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ],
        prompt: 'consent'
    });
    console.log('🔄 Redirecting to Google:', authorizeUrl);
    res.redirect(authorizeUrl);
});

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */
router.get('/google/callback', asyncHandler(async (req, res) => {
    const { code } = req.query;

    console.log('📥 Google Callback received, code:', code ? 'present' : 'missing');

    if (!code) {
        throw new ApiError(400, 'Authorization code missing', 'MISSING_CODE');
    }

    try {
        // Exchange code for tokens
        console.log('🔄 Exchanging code for tokens...');
        const { tokens } = await googleClient.getToken(code);
        googleClient.setCredentials(tokens);
        console.log('✅ Tokens received');

        // Get user info
        console.log('🔄 Fetching user info from Google...');
        const oauth2 = await googleClient.request({
            url: 'https://www.googleapis.com/oauth2/v2/userinfo'
        });

        const googleUser = oauth2.data;
        console.log('✅ Google User Info:', {
            id: googleUser.id,
            email: googleUser.email,
            name: googleUser.name
        });

        // Upsert user (find or create)
        console.log('🔄 Upserting user to database...');
        const user = await User.upsertGoogleUser({
            googleId: googleUser.id,
            email: googleUser.email,
            name: googleUser.name,
            avatarUrl: googleUser.picture
        });
        console.log('✅ User upserted:', user);

        // Generate tokens
        console.log('🔄 Generating JWT tokens...');
        const { accessToken, refreshToken } = User.generateTokens(user.id);
        console.log('✅ Tokens generated for user:', user.id);

        // Save session
        console.log('🔄 Saving session...');
        await User.saveSession(
            user.id,
            refreshToken,
            req.headers['user-agent'],
            req.ip
        );
        console.log('✅ Session saved');

        // Set refresh token as HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: config.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Redirect to frontend with token
        const frontendUrl = config.FRONTEND_URL || 'http://localhost:3000';
        console.log('🔄 Redirecting to:', `${frontendUrl}/auth/callback?token=...`);
        res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);

    } catch (error) {
        console.error('❌ Google Auth Error:', error.message);
        console.error('❌ Full error:', error);
        const frontendUrl = config.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
}));

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', authRateLimiter, asyncHandler(async (req, res) => {
    const { email, password, name, firstName, lastName, phoneNumber, countryCode, captchaToken } = req.body;

    // Validation
    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required', 'MISSING_FIELDS');
    }

    // Verify Captcha
    const isCaptchaValid = await verifyTurnstile(captchaToken, req.ip);
    if (!isCaptchaValid) {
        throw new ApiError(400, 'Security check failed. Please try again.', 'CAPTCHA_FAILED');
    }

    if (password.length < 8) {
        throw new ApiError(400, 'Password must be at least 8 characters', 'WEAK_PASSWORD');
    }

    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
        throw new ApiError(409, 'Email already registered', 'EMAIL_EXISTS');
    }

    // Create user
    const user = await User.create({
        email,
        password,
        name,
        firstName,
        lastName,
        phoneNumber,
        countryCode
    });

    // Log user registration
    ActivityLogger.logUserRegister(
        user.id,
        email,
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent']
    );

    // Check if SMTP is enabled and send verification email
    const smtpEnabled = await emailService.isEnabled();
    console.log(`📧 SMTP Enabled Check: ${smtpEnabled}`);

    if (smtpEnabled) {
        try {
            console.log(`📧 Initializing email service for ${email}...`);
            // Initialize email service before sending (force reinitialize to get latest settings)
            await emailService.initialize(true);

            if (!emailService.transporter) {
                console.error(`❌ Email transporter not available after initialization`);
                throw new Error('Email service not properly configured. Please check SMTP settings in admin panel.');
            }

            const baseUrl = config.FRONTEND_URL || req.headers.origin || 'http://localhost:3000';
            console.log(`📧 Sending verification email to ${email} with token: ${user.verificationToken.substring(0, 8)}...`);
            console.log(`📧 Verification URL: ${baseUrl}/verify-email?token=${user.verificationToken}`);

            const result = await emailService.sendVerificationEmail(
                email,
                name || firstName || 'User',
                user.verificationToken,
                baseUrl
            );

            if (result.success) {
                console.log(`✅ Verification email sent successfully to ${email}`);
                console.log(`   Message ID: ${result.messageId || 'N/A'}`);
                res.status(201).json({
                    success: true,
                    message: 'Account created successfully. Please check your email to verify your account.',
                    userId: user.id,
                    emailSent: true
                });
            } else {
                console.error(`❌ Failed to send verification email to ${email}`);
                console.error(`   Error: ${result.error}`);
                console.error(`   Warning: ${result.warning || 'None'}`);
                // Still create account even if email fails
                res.status(201).json({
                    success: true,
                    message: 'Account created successfully. Email verification could not be sent. Please check your SMTP settings or contact support.',
                    userId: user.id,
                    emailSent: false,
                    error: result.error || 'Unknown error'
                });
            }
        } catch (error) {
            console.error(`❌ Exception while sending verification email to ${email}:`);
            console.error(`   Error Type: ${error.constructor.name}`);
            console.error(`   Error Message: ${error.message}`);
            console.error(`   Error Stack: ${error.stack}`);
            // Still create account even if email fails
            res.status(201).json({
                success: true,
                message: 'Account created successfully. Email verification could not be sent. Please check your SMTP settings or contact support.',
                userId: user.id,
                emailSent: false,
                error: error.message || 'Unknown error'
            });
        }
    } else {
        console.log(`⚠️ SMTP is disabled. User can register without email verification.`);
        // SMTP disabled - user can register without verification
        res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            userId: user.id,
            emailSent: false
        });
    }
}));

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', authRateLimiter, asyncHandler(async (req, res) => {
    const { email, password, captchaToken } = req.body;

    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required', 'MISSING_FIELDS');
    }

    // Verify Captcha
    const isCaptchaValid = await verifyTurnstile(captchaToken, req.ip);
    if (!isCaptchaValid) {
        throw new ApiError(400, 'Security check failed. Please try again.', 'CAPTCHA_FAILED');
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
        throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Check password
    const isValidPassword = await User.verifyPassword(user, password);
    if (!isValidPassword) {
        throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Check if account is suspended
    if (user.status === 'suspended' || user.status === 'banned') {
        throw new ApiError(403, 'Account is suspended', 'ACCOUNT_SUSPENDED');
    }

    // Check if email verification is required
    const settingsResult = await query(
        'SELECT require_email_verification, smtp_enabled FROM system_settings WHERE id = $1',
        ['00000000-0000-0000-0000-000000000001']
    );

    const settings = settingsResult.rows[0];
    const requireVerification = settings?.require_email_verification && settings?.smtp_enabled;

    if (requireVerification && !user.email_verified) {
        throw new ApiError(403, 'Please verify your email before logging in. Check your inbox for the verification link.', 'EMAIL_NOT_VERIFIED');
    }

    // Generate tokens
    const { accessToken, refreshToken } = User.generateTokens(user.id);

    // Save session
    await User.saveSession(
        user.id,
        refreshToken,
        req.headers['user-agent'],
        req.ip
    );

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Log user login
    ActivityLogger.logUserLogin(
        user.id,
        email,
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent']
    );

    res.json({
        success: true,
        token: accessToken,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerified: user.email_verified,
            avatarUrl: user.avatar_url
        }
    });
}));

/**
 * POST /api/auth/logout
 * Logout current session
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
        await User.deleteSession(refreshToken);
    }

    res.clearCookie('refreshToken');

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
}));

/**
 * POST /api/auth/logout-all
 * Logout all sessions
 */
router.post('/logout-all', authenticate, asyncHandler(async (req, res) => {
    await User.deleteAllSessions(req.user.id);

    res.clearCookie('refreshToken');

    res.json({
        success: true,
        message: 'Logged out from all devices'
    });
}));

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
        throw new ApiError(401, 'Refresh token required', 'NO_REFRESH_TOKEN');
    }

    // Validate session
    const session = await User.validateSession(refreshToken);
    if (!session) {
        res.clearCookie('refreshToken');
        throw new ApiError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = User.generateTokens(session.user_id);

    // Delete old session and create new one
    await User.deleteSession(refreshToken);
    await User.saveSession(
        session.user_id,
        newRefreshToken,
        req.headers['user-agent'],
        req.ip
    );

    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
        success: true,
        token: accessToken
    });
}));

/**
 * GET /api/auth/session
 * Get current session/user
 */
router.get('/session', authenticate, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    res.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            status: user.status,
            emailVerified: user.email_verified,
            avatarUrl: user.avatar_url,
            phoneNumber: user.phone_number
        }
    });
}));

/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
router.post('/verify-email', asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
        throw new ApiError(400, 'Verification token required', 'MISSING_TOKEN');
    }

    const user = await User.verifyEmail(token);

    if (!user) {
        throw new ApiError(400, 'Invalid or expired verification token', 'INVALID_TOKEN');
    }

    res.json({
        success: true,
        message: 'Email verified successfully'
    });
}));

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', authRateLimiter, asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, 'Email is required', 'MISSING_EMAIL');
    }

    const resetToken = await User.createResetToken(email);

    // Always respond with success to prevent email enumeration
    if (resetToken) {
        // TODO: Send reset email
        // await sendPasswordResetEmail(email, resetToken);
    }

    res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.'
    });
}));

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', authRateLimiter, asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        throw new ApiError(400, 'Token and password are required', 'MISSING_FIELDS');
    }

    if (password.length < 8) {
        throw new ApiError(400, 'Password must be at least 8 characters', 'WEAK_PASSWORD');
    }

    const user = await User.resetPassword(token, password);

    if (!user) {
        throw new ApiError(400, 'Invalid or expired reset token', 'INVALID_TOKEN');
    }

    // Invalidate all sessions
    await User.deleteAllSessions(user.id);

    res.json({
        success: true,
        message: 'Password reset successfully. Please login with your new password.'
    });
}));

/**
 * PUT /api/auth/change-password
 * Change password (authenticated)
 */
router.put('/change-password', authenticate, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new ApiError(400, 'Current and new password are required', 'MISSING_FIELDS');
    }

    if (newPassword.length < 8) {
        throw new ApiError(400, 'New password must be at least 8 characters', 'WEAK_PASSWORD');
    }

    const user = await User.findById(req.user.id);

    // Verify current password
    const isValid = await User.verifyPassword(user, currentPassword);
    if (!isValid) {
        throw new ApiError(401, 'Current password is incorrect', 'INVALID_PASSWORD');
    }

    // Update password
    await User.updatePassword(req.user.id, newPassword);

    // Invalidate all other sessions
    const currentRefreshToken = req.cookies.refreshToken;
    await User.deleteAllSessions(req.user.id);

    // Recreate current session
    if (currentRefreshToken) {
        const { refreshToken } = User.generateTokens(req.user.id);
        await User.saveSession(req.user.id, refreshToken, req.headers['user-agent'], req.ip);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: config.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
    }

    res.json({
        success: true,
        message: 'Password changed successfully'
    });
}));

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', authRateLimiter, asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, 'Email is required', 'MISSING_EMAIL');
    }

    // Check if SMTP is enabled
    const smtpEnabled = await emailService.isEnabled();
    if (!smtpEnabled) {
        throw new ApiError(503, 'Password reset is not available. SMTP is disabled.', 'SMTP_DISABLED');
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
        // Don't reveal if email exists for security
        return res.json({
            success: true,
            message: 'If an account with that email exists, a password reset email has been sent.'
        });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token
    await query(
        'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
        [resetToken, resetExpires, user.id]
    );

    // Send reset email
    const baseUrl = config.FRONTEND_URL || req.headers.origin || 'http://localhost:3000';
    const result = await emailService.sendPasswordResetEmail(
        email,
        user.name || 'User',
        resetToken,
        baseUrl
    );

    if (result.success) {
        res.json({
            success: true,
            message: 'If an account with that email exists, a password reset email has been sent.'
        });
    } else {
        throw new ApiError(500, 'Failed to send password reset email', 'EMAIL_SEND_FAILED');
    }
}));

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', authRateLimiter, asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        throw new ApiError(400, 'Token and new password are required', 'MISSING_FIELDS');
    }

    if (newPassword.length < 8) {
        throw new ApiError(400, 'Password must be at least 8 characters', 'WEAK_PASSWORD');
    }

    // Find user by reset token
    const result = await query(
        'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
        [token]
    );

    if (result.rows.length === 0) {
        throw new ApiError(400, 'Invalid or expired reset token', 'INVALID_TOKEN');
    }

    const user = result.rows[0];

    // Hash new password
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await query(
        'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
        [passwordHash, user.id]
    );

    res.json({
        success: true,
        message: 'Password reset successfully'
    });
}));

/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
router.post('/verify-email', authRateLimiter, asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
        throw new ApiError(400, 'Verification token is required', 'MISSING_TOKEN');
    }

    // Find user by verification token
    const result = await query(
        'SELECT * FROM users WHERE verification_token = $1 AND verification_token_expires > NOW()',
        [token]
    );

    if (result.rows.length === 0) {
        throw new ApiError(400, 'Invalid or expired verification token', 'INVALID_TOKEN');
    }

    const user = result.rows[0];

    // Check if already verified
    if (user.email_verified) {
        return res.json({
            success: true,
            message: 'Email is already verified'
        });
    }

    // Mark email as verified
    await query(
        'UPDATE users SET email_verified = TRUE, email_verified_at = NOW(), verification_token = NULL, verification_token_expires = NULL WHERE id = $1',
        [user.id]
    );

    // Update user profile
    await query(
        'UPDATE user_profiles SET email_verified = TRUE WHERE id = $1',
        [user.id]
    );

    res.json({
        success: true,
        message: 'Email verified successfully'
    });
}));

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
router.post('/resend-verification', authRateLimiter, asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, 'Email is required', 'MISSING_EMAIL');
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    // Check if already verified
    if (user.email_verified) {
        return res.json({
            success: true,
            message: 'Email is already verified'
        });
    }

    // Check if SMTP is enabled
    const smtpEnabled = await emailService.isEnabled();
    if (!smtpEnabled) {
        throw new ApiError(503, 'Email service is not configured', 'SMTP_DISABLED');
    }

    try {
        // Initialize email service
        await emailService.initialize(true);

        if (!emailService.transporter) {
            throw new ApiError(500, 'Email service not properly configured', 'SMTP_NOT_CONFIGURED');
        }

        // Generate new verification token if expired or missing
        let verificationToken = user.verification_token;
        if (!verificationToken || (user.verification_token_expires && new Date(user.verification_token_expires) < new Date())) {
            verificationToken = require('crypto').randomUUID();
            const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            await query(
                'UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3',
                [verificationToken, verificationExpires, user.id]
            );
        }

        const baseUrl = config.FRONTEND_URL || req.headers.origin || 'http://localhost:3000';
        const result = await emailService.sendVerificationEmail(
            email,
            user.name || 'User',
            verificationToken,
            baseUrl
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'Verification email sent successfully. Please check your inbox.'
            });
        } else {
            throw new ApiError(500, result.error || 'Failed to send verification email', 'EMAIL_SEND_FAILED');
        }
    } catch (error) {
        console.error(`❌ Error resending verification email to ${email}:`, error);
        throw new ApiError(500, error.message || 'Failed to send verification email', 'EMAIL_ERROR');
    }
}));

module.exports = router;
