/**
 * SharedChat Model
 * Database operations for shared chat links
 */

const crypto = require('crypto');
const { query } = require('../config/database');

class SharedChat {
    /**
     * Generate a secure random token (256-bit entropy)
     */
    static generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Create a share link for a conversation
     */
    static async create(conversationId, expiresAt = null) {
        const shareToken = this.generateToken();

        const result = await query(
            `INSERT INTO shared_chats (conversation_id, share_token, expires_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (conversation_id) 
             DO UPDATE SET is_active = true, share_token = EXCLUDED.share_token, expires_at = EXCLUDED.expires_at
             RETURNING *`,
            [conversationId, shareToken, expiresAt]
        );

        return result.rows[0];
    }

    /**
     * Find by share token
     */
    static async findByToken(shareToken) {
        const result = await query(
            `SELECT sc.*, c.title, c.model
             FROM shared_chats sc
             JOIN conversations c ON sc.conversation_id = c.id
             WHERE sc.share_token = $1 
             AND sc.is_active = true
             AND (sc.expires_at IS NULL OR sc.expires_at > NOW())`,
            [shareToken]
        );
        return result.rows[0] || null;
    }

    /**
     * Find by conversation ID
     */
    static async findByConversationId(conversationId) {
        const result = await query(
            `SELECT * FROM shared_chats 
             WHERE conversation_id = $1 AND is_active = true`,
            [conversationId]
        );
        return result.rows[0] || null;
    }

    /**
     * Increment view count
     */
    static async incrementViewCount(shareToken) {
        await query(
            `UPDATE shared_chats SET view_count = view_count + 1 WHERE share_token = $1`,
            [shareToken]
        );
    }

    /**
     * Revoke (deactivate) a share link
     */
    static async revoke(conversationId) {
        const result = await query(
            `UPDATE shared_chats SET is_active = false WHERE conversation_id = $1 RETURNING *`,
            [conversationId]
        );
        return result.rows[0] || null;
    }

    /**
     * Delete share link
     */
    static async delete(conversationId) {
        const result = await query(
            `DELETE FROM shared_chats WHERE conversation_id = $1 RETURNING *`,
            [conversationId]
        );
        return result.rowCount > 0;
    }

    /**
     * Get shared messages (sanitized - no user info)
     */
    static async getSharedMessages(shareToken) {
        const shared = await this.findByToken(shareToken);
        if (!shared) return null;

        // Increment view count
        await this.incrementViewCount(shareToken);

        // Get only messages - no user info
        const messagesResult = await query(
            `SELECT id, role, content, response_time, created_at
             FROM messages 
             WHERE conversation_id = $1 
             ORDER BY created_at ASC`,
            [shared.conversation_id]
        );

        return {
            title: shared.title || 'Shared Conversation',
            model: shared.model,
            messages: messagesResult.rows.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                responseTime: m.response_time,
                createdAt: m.created_at
            })),
            viewCount: shared.view_count + 1,
            createdAt: shared.created_at
        };
    }
}

module.exports = SharedChat;
