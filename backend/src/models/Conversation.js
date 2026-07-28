/**
 * Conversation Model
 * Database operations for conversations
 */

const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');

class Conversation {
    /**
     * Create a new conversation
     */
    static async create(userId, { title = 'New Chat', model = 'gpt-oss-120b' } = {}) {
        const id = uuidv4();

        const result = await query(
            `INSERT INTO conversations (id, user_id, title, model)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [id, userId, title, model]
        );

        return result.rows[0];
    }

    /**
     * Find conversation by ID
     */
    static async findById(id) {
        const result = await query(
            'SELECT * FROM conversations WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Find conversation by ID with user check
     */
    static async findByIdForUser(id, userId) {
        const result = await query(
            'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Get all conversations for a user
     */
    static async findByUserId(userId, { includeArchived = false } = {}) {
        let sql = `
      SELECT c.*, 
             (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
      FROM conversations c
      WHERE c.user_id = $1
    `;

        if (!includeArchived) {
            sql += ' AND c.is_archived = FALSE';
        }

        sql += ' ORDER BY c.is_pinned DESC, c.updated_at DESC';

        const result = await query(sql, [userId]);
        return result.rows;
    }

    /**
     * Get conversation with messages
     */
    static async findWithMessages(id, userId) {
        const convResult = await query(
            'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (convResult.rows.length === 0) {
            return null;
        }

        const msgResult = await query(
            'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
            [id]
        );

        return {
            ...convResult.rows[0],
            messages: msgResult.rows
        };
    }

    /**
     * Update conversation
     */
    static async update(id, userId, updates) {
        const allowedFields = ['title', 'model', 'is_pinned', 'is_archived'];
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
            return this.findByIdForUser(id, userId);
        }

        values.push(id, userId);

        const result = await query(
            `UPDATE conversations 
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
            values
        );

        return result.rows[0] || null;
    }

    /**
     * Rename conversation
     */
    static async rename(id, userId, title) {
        const result = await query(
            `UPDATE conversations 
       SET title = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
            [title, id, userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Toggle pin status
     */
    static async togglePin(id, userId) {
        const result = await query(
            `UPDATE conversations 
       SET is_pinned = NOT is_pinned, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
            [id, userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Toggle archive status
     */
    static async toggleArchive(id, userId) {
        const result = await query(
            `UPDATE conversations 
       SET is_archived = NOT is_archived, is_pinned = FALSE, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
            [id, userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Delete conversation (cascades to messages)
     */
    static async delete(id, userId) {
        const result = await query(
            'DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );
        return result.rowCount > 0;
    }

    /**
     * Delete all conversations for a user
     */
    static async deleteAllForUser(userId) {
        const result = await query(
            'DELETE FROM conversations WHERE user_id = $1 RETURNING id',
            [userId]
        );
        return result.rowCount;
    }

    /**
     * Archive all conversations for a user
     */
    static async archiveAllForUser(userId) {
        const result = await query(
            `UPDATE conversations 
             SET is_archived = TRUE, is_pinned = FALSE, updated_at = NOW()
             WHERE user_id = $1 AND is_archived = FALSE
             RETURNING id`,
            [userId]
        );
        return result.rowCount;
    }

    /**
     * Unarchive all conversations for a user
     */
    static async unarchiveAllForUser(userId) {
        const result = await query(
            `UPDATE conversations 
             SET is_archived = FALSE, updated_at = NOW()
             WHERE user_id = $1 AND is_archived = TRUE
             RETURNING id`,
            [userId]
        );
        return result.rowCount;
    }

    /**
     * Get all conversations (admin)
     */
    static async getAll({ limit = 100, offset = 0 } = {}) {
        const result = await query(
            `SELECT c.*, up.name as user_name, up.email as user_email,
              (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
       FROM conversations c
       LEFT JOIN user_profiles up ON c.user_id = up.id
       ORDER BY c.updated_at DESC
       LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows;
    }

    /**
     * Get conversation count
     */
    static async count() {
        const result = await query('SELECT COUNT(*) FROM conversations');
        return parseInt(result.rows[0].count);
    }

    /**
     * Search conversations
     */
    static async search(searchTerm, { limit = 50 } = {}) {
        const result = await query(
            `SELECT c.*, up.name as user_name, up.email as user_email
       FROM conversations c
       LEFT JOIN user_profiles up ON c.user_id = up.id
       WHERE c.title ILIKE $1
       ORDER BY c.updated_at DESC
       LIMIT $2`,
            [`%${searchTerm}%`, limit]
        );
        return result.rows;
    }

    /**
     * Touch conversation (update updated_at)
     */
    static async touch(id) {
        await query(
            'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
            [id]
        );
    }
}

module.exports = Conversation;
