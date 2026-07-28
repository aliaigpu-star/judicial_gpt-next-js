/**
 * Message Model
 * Database operations for messages and versions
 */

const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');

class Message {
    /**
     * Create a new message
     */
    static async create(conversationId, { role, content, responseTime = null, metadata = {} }) {
        const id = uuidv4();

        const result = await query(
            `INSERT INTO messages (id, conversation_id, role, content, response_time, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [id, conversationId, role, content, responseTime, JSON.stringify(metadata)]
        );

        // Update conversation's updated_at
        await query(
            'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
            [conversationId]
        );

        return result.rows[0];
    }

    /**
     * Find message by ID
     */
    static async findById(id) {
        const result = await query(
            'SELECT * FROM messages WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Get all messages for a conversation
     */
    static async findByConversationId(conversationId) {
        const result = await query(
            'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
            [conversationId]
        );
        return result.rows;
    }

    /**
     * Update message content
     */
    static async update(id, content) {
        const result = await query(
            'UPDATE messages SET content = $1 WHERE id = $2 RETURNING *',
            [content, id]
        );
        return result.rows[0] || null;
    }

    /**
     * Save version and update message
     */
    static async saveVersionAndUpdate(id, newContent) {
        return transaction(async (client) => {
            // Get current message
            const msgResult = await client.query(
                'SELECT * FROM messages WHERE id = $1',
                [id]
            );

            if (msgResult.rows.length === 0) {
                throw new Error('Message not found');
            }

            const message = msgResult.rows[0];
            const currentVersion = message.current_version || 1;
            const totalVersions = message.total_versions || 1;
            const newVersionNumber = totalVersions + 1;

            // Save current content as a version if it doesn't exist
            await client.query(
                `INSERT INTO message_versions (message_id, version_number, content)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (message_id, version_number) DO NOTHING`,
                [id, currentVersion, message.content || '']
            );

            // Save new content as new version
            await client.query(
                `INSERT INTO message_versions (message_id, version_number, content)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (message_id, version_number) DO UPDATE SET content = $3`,
                [id, newVersionNumber, newContent || '']
            );

            // Update message with new content and version info
            const updateResult = await client.query(
                `UPDATE messages 
                 SET content = $1, 
                     current_version = $2, 
                     total_versions = CASE WHEN total_versions < $2 THEN $2 ELSE total_versions END
                 WHERE id = $3
                 RETURNING *`,
                [newContent || '', newVersionNumber, id]
            );

            return updateResult.rows[0];
        });
    }

    /**
     * Get message versions
     */
    static async getVersions(messageId) {
        const result = await query(
            `SELECT * FROM message_versions 
       WHERE message_id = $1 
       ORDER BY version_number ASC`,
            [messageId]
        );
        return result.rows;
    }

    /**
     * Get specific version content
     */
    static async getVersion(messageId, versionNumber) {
        const result = await query(
            `SELECT * FROM message_versions 
       WHERE message_id = $1 AND version_number = $2`,
            [messageId, versionNumber]
        );
        return result.rows[0] || null;
    }

    /**
     * Switch to a specific version
     */
    static async switchVersion(messageId, versionNumber) {
        return transaction(async (client) => {
            // Get version content
            const versionResult = await client.query(
                `SELECT content FROM message_versions 
         WHERE message_id = $1 AND version_number = $2`,
                [messageId, versionNumber]
            );

            if (versionResult.rows.length === 0) {
                throw new Error('Version not found');
            }

            // Update message
            const updateResult = await client.query(
                `UPDATE messages 
         SET content = $1, current_version = $2
         WHERE id = $3
         RETURNING *`,
                [versionResult.rows[0].content, versionNumber, messageId]
            );

            return updateResult.rows[0];
        });
    }

    /**
     * Delete message
     */
    static async delete(id) {
        const result = await query(
            'DELETE FROM messages WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rowCount > 0;
    }

    /**
     * Delete multiple messages by IDs
     */
    static async deleteMany(ids) {
        if (!ids || ids.length === 0) return 0;

        const result = await query(
            'DELETE FROM messages WHERE id = ANY($1) RETURNING id',
            [ids]
        );
        return result.rowCount;
    }

    /**
     * Delete all messages in a conversation
     */
    static async deleteByConversationId(conversationId) {
        const result = await query(
            'DELETE FROM messages WHERE conversation_id = $1 RETURNING id',
            [conversationId]
        );
        return result.rowCount;
    }

    /**
     * Get message count
     */
    static async count() {
        const result = await query('SELECT COUNT(*) FROM messages');
        return parseInt(result.rows[0].count);
    }

    /**
     * Get message count for user
     */
    static async countForUser(userId) {
        const result = await query(
            `SELECT COUNT(*) FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE c.user_id = $1`,
            [userId]
        );
        return parseInt(result.rows[0].count);
    }

    /**
     * Set feedback (like/dislike) on a message
     */
    static async setFeedback(id, feedback) {
        // feedback should be 'like', 'dislike', or null
        let result;
        if (feedback) {
            // Set or update the feedback
            result = await query(
                `UPDATE messages SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb WHERE id = $2 RETURNING *`,
                [JSON.stringify({ feedback }), id]
            );
        } else {
            // Remove the feedback by setting metadata without it
            result = await query(
                `UPDATE messages SET metadata = COALESCE(metadata, '{}'::jsonb) - 'feedback' WHERE id = $1 RETURNING *`,
                [id]
            );
        }
        return result.rows[0] || null;
    }

    /**
     * Get feedback for a message
     */
    static async getFeedback(id) {
        const result = await query(
            'SELECT metadata FROM messages WHERE id = $1',
            [id]
        );
        if (result.rows[0]?.metadata?.feedback) {
            return result.rows[0].metadata.feedback;
        }
        return null;
    }
}

module.exports = Message;
