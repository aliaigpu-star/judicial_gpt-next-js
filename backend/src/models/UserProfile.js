/**
 * UserProfile Model
 * Database operations for user profiles
 */

const { query } = require('../config/database');

class UserProfile {
    /**
     * Get profile by user ID
     */
    static async findByUserId(userId) {
        const result = await query(
            'SELECT * FROM user_profiles WHERE id = $1',
            [userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Update profile
     */
    static async update(userId, updates) {
        const allowedFields = [
            'name', 'first_name', 'last_name', 'phone_number',
            'country_code', 'avatar_url', 'profile_picture_url', 'preferences'
        ];

        const fields = [];
        const values = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key) && value !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (fields.length === 0) {
            return this.findByUserId(userId);
        }

        values.push(userId);

        const result = await query(
            `UPDATE user_profiles 
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
            values
        );

        return result.rows[0] || null;
    }

    /**
     * Update role (admin only)
     */
    static async updateRole(userId, role) {
        const validRoles = ['user', 'admin', 'moderator'];
        if (!validRoles.includes(role)) {
            throw new Error('Invalid role');
        }

        const result = await query(
            'UPDATE user_profiles SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [role, userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Update status (admin only)
     */
    static async updateStatus(userId, status) {
        const validStatuses = ['active', 'inactive', 'suspended', 'banned'];
        if (!validStatuses.includes(status)) {
            throw new Error('Invalid status');
        }

        const result = await query(
            'UPDATE user_profiles SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Update avatar
     */
    static async updateAvatar(userId, avatarUrl) {
        const result = await query(
            'UPDATE user_profiles SET avatar_url = $1, profile_picture_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [avatarUrl, userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Remove avatar
     */
    static async removeAvatar(userId) {
        const result = await query(
            'UPDATE user_profiles SET avatar_url = NULL, profile_picture_url = NULL, updated_at = NOW() WHERE id = $1 RETURNING *',
            [userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Get user statistics
     */
    static async getStats(userId) {
        const result = await query(
            `SELECT 
         (SELECT COUNT(*) FROM conversations WHERE user_id = $1) as conversation_count,
         (SELECT COUNT(*) FROM messages m 
          JOIN conversations c ON m.conversation_id = c.id 
          WHERE c.user_id = $1) as message_count,
         (SELECT MAX(c.updated_at) FROM conversations c WHERE c.user_id = $1) as last_activity`,
            [userId]
        );
        return result.rows[0];
    }

    /**
     * Search users by name or email
     */
    static async search(searchTerm, limit = 50) {
        const result = await query(
            `SELECT up.*, u.email as user_email, u.created_at as user_created_at
       FROM user_profiles up
       JOIN users u ON up.id = u.id
       WHERE up.name ILIKE $1 OR up.email ILIKE $1
       ORDER BY up.created_at DESC
       LIMIT $2`,
            [`%${searchTerm}%`, limit]
        );
        return result.rows;
    }
}

module.exports = UserProfile;
