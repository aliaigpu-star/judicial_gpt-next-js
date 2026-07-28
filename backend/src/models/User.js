/**
 * User Model
 * Database operations for users and authentication
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');
const config = require('../config/env');

class User {
    /**
     * Create a new user with profile
     */
    static async create({ email, password, name, firstName, lastName, phoneNumber, countryCode }) {
        const passwordHash = await bcrypt.hash(password, 12);
        const userId = uuidv4();
        const verificationToken = uuidv4();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        return transaction(async (client) => {
            // Create user
            await client.query(
                `INSERT INTO users (id, email, password_hash, verification_token, verification_token_expires)
         VALUES ($1, $2, $3, $4, $5)`,
                [userId, email.toLowerCase(), passwordHash, verificationToken, verificationExpires]
            );

            // Create profile
            const fullName = name || `${firstName || ''} ${lastName || ''}`.trim();
            await client.query(
                `INSERT INTO user_profiles (id, name, first_name, last_name, email, phone_number, country_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [userId, fullName, firstName, lastName, email.toLowerCase(), phoneNumber, countryCode]
            );

            return {
                id: userId,
                email: email.toLowerCase(),
                verificationToken
            };
        });
    }

    /**
     * Find user by email
     */
    static async findByEmail(email) {
        const result = await query(
            `SELECT u.*, up.name, up.first_name, up.last_name, up.role, up.status, up.avatar_url
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.id
       WHERE u.email = $1`,
            [email.toLowerCase()]
        );
        return result.rows[0] || null;
    }

    /**
     * Find user by ID
     */
    static async findById(id) {
        const result = await query(
            `SELECT u.*, up.name, up.first_name, up.last_name, up.role, up.status, up.avatar_url, up.phone_number
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.id
       WHERE u.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Find user by Google ID
     */
    static async findByGoogleId(googleId) {
        const result = await query(
            `SELECT u.*, up.name, up.role, up.status, up.avatar_url
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.id
       WHERE u.google_id = $1`,
            [googleId]
        );
        return result.rows[0] || null;
    }

    /**
     * Create or update user from Google OAuth
     */
    static async upsertGoogleUser({ googleId, email, name, avatarUrl }) {
        const userId = uuidv4();
        console.log('🔄 upsertGoogleUser called with:', { googleId, email, name, avatarUrl: avatarUrl ? 'present' : 'missing' });

        try {
            return await transaction(async (client) => {
                console.log('🔄 Transaction started');

                // Try to find existing user
                console.log('🔄 Looking for existing user...');
                const existingResult = await client.query(
                    'SELECT id FROM users WHERE google_id = $1 OR email = $2',
                    [googleId, email.toLowerCase()]
                );
                console.log('📊 Existing user search result:', existingResult.rows.length, 'rows');

                if (existingResult.rows.length > 0) {
                    const existingUserId = existingResult.rows[0].id;
                    console.log('✅ Found existing user:', existingUserId);

                    // Update Google ID if not set
                    console.log('🔄 Updating user google_id...');
                    await client.query(
                        'UPDATE users SET google_id = $1, email_verified = TRUE, email_verified_at = NOW() WHERE id = $2',
                        [googleId, existingUserId]
                    );
                    console.log('✅ User google_id updated');

                    // Update profile
                    console.log('🔄 Updating user profile...');
                    await client.query(
                        'UPDATE user_profiles SET name = COALESCE(name, $1), avatar_url = COALESCE(avatar_url, $2) WHERE id = $3',
                        [name, avatarUrl, existingUserId]
                    );
                    console.log('✅ User profile updated');

                    return { id: existingUserId, isNew: false };
                }

                // Create new user
                console.log('🔄 Creating new user with ID:', userId);
                await client.query(
                    `INSERT INTO users (id, email, password_hash, google_id, email_verified, email_verified_at)
         VALUES ($1, $2, '', $3, TRUE, NOW())`,
                    [userId, email.toLowerCase(), googleId]
                );
                console.log('✅ User created in users table');

                console.log('🔄 Creating user profile...');
                await client.query(
                    `INSERT INTO user_profiles (id, name, email, avatar_url, email_verified)
         VALUES ($1, $2, $3, $4, TRUE)`,
                    [userId, name, email.toLowerCase(), avatarUrl]
                );
                console.log('✅ User profile created');

                return { id: userId, isNew: true };
            });
        } catch (error) {
            console.error('❌ upsertGoogleUser error:', error.message);
            console.error('❌ Full error:', error);
            throw error;
        }
    }

    /**
     * Verify password
     */
    static async verifyPassword(user, password) {
        if (!user.password_hash) return false;
        return bcrypt.compare(password, user.password_hash);
    }

    /**
     * Generate JWT tokens
     */
    static generateTokens(userId) {
        const accessToken = jwt.sign(
            { userId },
            config.JWT_SECRET,
            { expiresIn: config.JWT_EXPIRES_IN }
        );

        const refreshToken = jwt.sign(
            { userId, type: 'refresh' },
            config.JWT_REFRESH_SECRET,
            { expiresIn: config.JWT_REFRESH_EXPIRES_IN }
        );

        return { accessToken, refreshToken };
    }

    /**
     * Verify email
     */
    static async verifyEmail(token) {
        const result = await query(
            `UPDATE users 
       SET email_verified = TRUE, 
           email_verified_at = NOW(),
           verification_token = NULL,
           verification_token_expires = NULL
       WHERE verification_token = $1 
         AND verification_token_expires > NOW()
       RETURNING id, email`,
            [token]
        );

        if (result.rows.length === 0) {
            return null;
        }

        // Update profile too
        await query(
            'UPDATE user_profiles SET email_verified = TRUE WHERE id = $1',
            [result.rows[0].id]
        );

        return result.rows[0];
    }

    /**
     * Create password reset token
     */
    static async createResetToken(email) {
        const resetToken = uuidv4();
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        const result = await query(
            `UPDATE users 
       SET reset_password_token = $1, reset_password_expires = $2
       WHERE email = $3
       RETURNING id`,
            [resetToken, resetExpires, email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return resetToken;
    }

    /**
     * Reset password
     */
    static async resetPassword(token, newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, 12);

        const result = await query(
            `UPDATE users 
       SET password_hash = $1,
           reset_password_token = NULL,
           reset_password_expires = NULL
       WHERE reset_password_token = $2 
         AND reset_password_expires > NOW()
       RETURNING id, email`,
            [passwordHash, token]
        );

        return result.rows[0] || null;
    }

    /**
     * Update password
     */
    static async updatePassword(userId, newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    }

    /**
     * Save refresh token session
     */
    static async saveSession(userId, refreshToken, userAgent, ipAddress) {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await query(
            `INSERT INTO sessions (user_id, refresh_token, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
            [userId, refreshToken, userAgent, ipAddress, expiresAt]
        );
    }

    /**
     * Validate and get session
     */
    static async validateSession(refreshToken) {
        const result = await query(
            `SELECT s.*, u.id as user_id, u.email
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.refresh_token = $1 AND s.expires_at > NOW()`,
            [refreshToken]
        );
        return result.rows[0] || null;
    }

    /**
     * Delete session
     */
    static async deleteSession(refreshToken) {
        await query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
    }

    /**
     * Delete all user sessions
     */
    static async deleteAllSessions(userId) {
        await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    }

    /**
     * Get all users (admin)
     */
    static async getAll() {
        const result = await query(
            `SELECT u.id, u.email, u.email_verified, u.created_at,
              up.name, up.role, up.status, up.avatar_url
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.id
       ORDER BY u.created_at DESC`
        );
        return result.rows;
    }

    /**
     * Get user count
     */
    static async count() {
        const result = await query('SELECT COUNT(*) FROM users');
        return parseInt(result.rows[0].count);
    }

    /**
     * Delete user
     */
    static async delete(userId) {
        await query('DELETE FROM users WHERE id = $1', [userId]);
    }
}

module.exports = User;
