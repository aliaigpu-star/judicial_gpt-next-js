/**
 * MessageFeedback Model
 * Like/dislike ratings on assistant replies, stored as self-contained
 * records (question + answer snapshot) for quality review and training.
 */

const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

/** Reasons a user can pick when disliking a reply. */
const DISLIKE_REASONS = {
    inaccurate: 'Inaccurate or wrong law',
    wrong_citation: 'Wrong citation / case reference',
    incomplete: 'Incomplete answer',
    not_relevant: "Didn't answer my question",
    unclear: 'Unclear or badly formatted',
    outdated: 'Outdated information',
    other: 'Other'
};

const REVIEW_STATUSES = ['new', 'reviewed', 'approved', 'excluded'];

/** Agent/section a conversation belongs to, from its title prefix. */
function sourceFromTitle(title = '') {
    const prefixes = [
        ['Civil Law', 'civil_law'],
        ['Criminal Law', 'criminal_law'],
        ['Family Law', 'family_law'],
        ['Summary', 'summarizer'],
        ['Judgment Search', 'judgment_search'],
        ['Civil Judgment', 'civil_judgment'],
        ['Criminal Judgment', 'criminal_judgment']
    ];
    const match = prefixes.find(([prefix]) => title.startsWith(prefix));
    return match ? match[1] : 'chat';
}

class MessageFeedback {
    /** Creates the table if needed (same SQL as migration 004). */
    static async ensureSchema() {
        const sql = fs.readFileSync(
            path.join(__dirname, '../../database/migrations/004_add_message_feedback.sql'),
            'utf8'
        );
        await query(sql);
        // One-time backfill of ratings saved before this table existed.
        await query(`
            INSERT INTO message_feedback (message_id, conversation_id, user_id, rating, response, message_version, source, created_at)
            SELECT m.id, m.conversation_id, c.user_id, m.metadata->>'feedback', m.content, m.current_version,
                   CASE
                       WHEN c.title LIKE 'Civil Law%' THEN 'civil_law'
                       WHEN c.title LIKE 'Criminal Law%' THEN 'criminal_law'
                       WHEN c.title LIKE 'Family Law%' THEN 'family_law'
                       WHEN c.title LIKE 'Summary%' THEN 'summarizer'
                       ELSE 'chat'
                   END,
                   m.created_at
            FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            WHERE m.metadata->>'feedback' IN ('like', 'dislike')
            ON CONFLICT (message_id, user_id) DO NOTHING
        `);
    }

    /**
     * Records (or updates) a user's rating of an assistant message, with a
     * snapshot of the question that produced it.
     */
    static async upsert({ message, conversation, userId, rating, reasons = [], comment = null, model = null }) {
        const promptResult = await query(
            `SELECT content FROM messages
             WHERE conversation_id = $1 AND role = 'user' AND created_at <= $2
             ORDER BY created_at DESC LIMIT 1`,
            [message.conversation_id, message.created_at]
        );
        const validReasons = rating === 'dislike' ? reasons.filter(r => r in DISLIKE_REASONS) : [];

        const result = await query(
            `INSERT INTO message_feedback
                (message_id, conversation_id, user_id, rating, reasons, comment, prompt, response, message_version, model, source)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (message_id, user_id) DO UPDATE SET
                rating = EXCLUDED.rating,
                reasons = EXCLUDED.reasons,
                comment = EXCLUDED.comment,
                prompt = EXCLUDED.prompt,
                response = EXCLUDED.response,
                message_version = EXCLUDED.message_version,
                model = EXCLUDED.model,
                source = EXCLUDED.source,
                review_status = 'new',
                updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [
                message.id,
                message.conversation_id,
                userId,
                rating,
                validReasons,
                comment ? String(comment).slice(0, 2000) : null,
                promptResult.rows[0]?.content || null,
                message.content,
                message.current_version || 1,
                model,
                sourceFromTitle(conversation?.title)
            ]
        );
        return result.rows[0];
    }

    static async remove(messageId, userId) {
        await query('DELETE FROM message_feedback WHERE message_id = $1 AND user_id = $2', [messageId, userId]);
    }

    /** Builds a WHERE clause from admin list filters. */
    static buildFilters({ rating, status, source, search, from, to } = {}) {
        const where = [];
        const params = [];
        const add = (clause, value) => {
            params.push(value);
            where.push(clause.replace('?', `$${params.length}`));
        };
        if (rating) add('f.rating = ?', rating);
        if (status) add('f.review_status = ?', status);
        if (source) add('f.source = ?', source);
        if (from) add('f.created_at >= ?', from);
        if (to) add('f.created_at < ?::date + 1', to);
        if (search) {
            params.push(`%${search}%`);
            const p = `$${params.length}`;
            where.push(`(f.prompt ILIKE ${p} OR f.response ILIKE ${p} OR f.comment ILIKE ${p} OR u.email ILIKE ${p})`);
        }
        return { whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
    }

    static async list(filters = {}, { limit = 25, offset = 0 } = {}) {
        const { whereSql, params } = this.buildFilters(filters);
        const base = `FROM message_feedback f
                      LEFT JOIN users u ON u.id = f.user_id
                      LEFT JOIN user_profiles up ON up.id = f.user_id
                      LEFT JOIN conversations c ON c.id = f.conversation_id
                      ${whereSql}`;
        const [rows, count] = await Promise.all([
            query(
                `SELECT f.*, u.email AS user_email, up.name AS user_name, c.title AS conversation_title
                 ${base}
                 ORDER BY f.created_at DESC
                 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
                [...params, limit, offset]
            ),
            query(`SELECT COUNT(*)::int AS total ${base}`, params)
        ]);
        return { items: rows.rows, total: count.rows[0].total };
    }

    static async stats() {
        const [totals, daily, reasons, sources, topDislikedUsers] = await Promise.all([
            query(`
                SELECT
                    COUNT(*) FILTER (WHERE rating = 'like')::int AS likes,
                    COUNT(*) FILTER (WHERE rating = 'dislike')::int AS dislikes,
                    COUNT(*) FILTER (WHERE review_status = 'new')::int AS pending_review,
                    COUNT(*) FILTER (WHERE review_status = 'approved')::int AS approved,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS last_7_days,
                    COUNT(DISTINCT user_id)::int AS raters
                FROM message_feedback`),
            query(`
                SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
                       COUNT(f.id) FILTER (WHERE f.rating = 'like')::int AS likes,
                       COUNT(f.id) FILTER (WHERE f.rating = 'dislike')::int AS dislikes
                FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
                LEFT JOIN message_feedback f ON f.created_at::date = d.day::date
                GROUP BY d.day ORDER BY d.day`),
            query(`
                SELECT reason, COUNT(*)::int AS count
                FROM message_feedback, UNNEST(reasons) AS reason
                WHERE rating = 'dislike'
                GROUP BY reason ORDER BY count DESC`),
            query(`
                SELECT source,
                       COUNT(*) FILTER (WHERE rating = 'like')::int AS likes,
                       COUNT(*) FILTER (WHERE rating = 'dislike')::int AS dislikes
                FROM message_feedback GROUP BY source ORDER BY COUNT(*) DESC`),
            query(`
                SELECT u.email, COUNT(*)::int AS dislikes
                FROM message_feedback f JOIN users u ON u.id = f.user_id
                WHERE f.rating = 'dislike'
                GROUP BY u.email ORDER BY dislikes DESC LIMIT 5`)
        ]);

        const t = totals.rows[0];
        const rated = t.likes + t.dislikes;
        return {
            ...t,
            total: rated,
            satisfaction: rated ? Math.round((t.likes / rated) * 1000) / 10 : null,
            daily: daily.rows,
            reasons: reasons.rows.map(r => ({ ...r, label: DISLIKE_REASONS[r.reason] || r.reason })),
            sources: sources.rows,
            topDislikedUsers: topDislikedUsers.rows
        };
    }

    static async review(id, { status, notes }, adminId) {
        const result = await query(
            `UPDATE message_feedback SET
                review_status = COALESCE($2, review_status),
                admin_notes = COALESCE($3, admin_notes),
                reviewed_by = $4,
                reviewed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 RETURNING *`,
            [id, status || null, notes ?? null, adminId]
        );
        return result.rows[0] || null;
    }

    /** All rows matching the filters, oldest first, for dataset export. */
    static async exportRows(filters = {}) {
        const { whereSql, params } = this.buildFilters(filters);
        const result = await query(
            `SELECT f.id, f.rating, f.reasons, f.comment, f.prompt, f.response, f.model, f.source,
                    f.review_status, f.admin_notes, f.message_version, f.created_at
             FROM message_feedback f
             LEFT JOIN users u ON u.id = f.user_id
             ${whereSql}
             ORDER BY f.created_at ASC`,
            params
        );
        return result.rows;
    }
}

module.exports = { MessageFeedback, DISLIKE_REASONS, REVIEW_STATUSES };
