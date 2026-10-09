/**
 * Case Library Routes
 * Read-only browsing of approved judgments from the LexIndex database
 * (table approved_cases, full text in judgments.file_content).
 *
 * Uses its own connection pool (LEXINDEX_DATABASE_URL) so it is fully
 * separate from the main JudicialGPT database.
 */

const express = require('express');
const { Pool } = require('pg');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const router = express.Router();

/** Only the first 100 approved judgments are offered. */
const LIBRARY_LIMIT = 100;
const PAGE_SIZE = 10;

let pool = null;
function getPool() {
    const connectionString = process.env.LEXINDEX_DATABASE_URL;
    if (!connectionString) {
        throw new ApiError(503, 'Case library is not configured (LEXINDEX_DATABASE_URL missing).', 'LIBRARY_UNAVAILABLE');
    }
    if (!pool) {
        pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 30000 });
        pool.on('error', err => console.error('LexIndex pool error:', err.message));
    }
    return pool;
}

/** The 100 judgments in the library, in a stable order. */
const LIBRARY_CTE = `
    WITH library AS (
        SELECT *
        FROM approved_cases
        ORDER BY year NULLS LAST, title, id
        LIMIT ${LIBRARY_LIMIT}
    )`;

/** Word-generated HTML → readable plain text with paragraph breaks. */
function htmlToText(html) {
    if (!html) return '';
    return html
        // In HTML, raw line breaks are just word wraps.
        .replace(/[\r\n]+/g, ' ')
        .replace(/<(script|style|head|xml)[^>]*>[\s\S]*?<\/\1>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li|tr|table|blockquote)>/gi, '\n\n')
        .replace(/<\/t[dh]>/gi, '\t')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&rsquo;|&lsquo;/gi, "'")
        .replace(/&ldquo;|&rdquo;/gi, '"')
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/[ \t ]+\n/g, '\n')
        .replace(/\n[ \t ]+/g, '\n')
        .replace(/[ \t ]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * GET /api/case-library?page=1&search=
 * One page (10) of the library, optionally filtered by title, court,
 * citation, judge or keywords.
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const search = String(req.query.search || '').trim().slice(0, 200);

    const params = [];
    let where = '';
    if (search) {
        params.push(`%${search}%`);
        where = `WHERE title ILIKE $1 OR court ILIKE $1 OR citation ILIKE $1 OR citation_raw ILIKE $1
                 OR judges ILIKE $1 OR author_judge ILIKE $1 OR keywords ILIKE $1 OR case_number ILIKE $1`;
    }

    const db = getPool();
    const [rows, count] = await Promise.all([
        db.query(
            `${LIBRARY_CTE}
             SELECT id, title, court, year, decision_date, citation, citation_raw, case_number,
                    case_type, author_judge, judges, petitioner, respondent,
                    LEFT(COALESCE(headnote, ratio_decidendi, ''), 320) AS summary
             FROM library ${where}
             ORDER BY year NULLS LAST, title, id
             LIMIT ${PAGE_SIZE} OFFSET $${params.length + 1}`,
            [...params, (page - 1) * PAGE_SIZE]
        ),
        db.query(`${LIBRARY_CTE} SELECT COUNT(*)::int AS total FROM library ${where}`, params)
    ]);

    const total = count.rows[0].total;
    res.json({
        success: true,
        cases: rows.rows,
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE))
    });
}));

/**
 * GET /api/case-library/:id
 * Full details and readable text of one judgment from the library.
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    const db = getPool();
    const result = await db.query(
        `${LIBRARY_CTE}
         SELECT l.id, l.title, l.court, l.year, l.decision_date, l.citation, l.citation_raw, l.citation_type,
                l.case_number, l.case_type, l.case_subtype, l.bench_type, l.jurisdiction,
                l.author_judge, l.judges, l.petitioner, l.respondent, l.keywords, l.acts_referred,
                l.headnote, l.ratio_decidendi, l.source_url, l.pdf_url,
                j.file_content, j.file_type
         FROM library l
         LEFT JOIN judgments j ON j.id = l.judgment_id
         WHERE l.id = $1`,
        [req.params.id]
    );

    const row = result.rows[0];
    if (!row) {
        throw new ApiError(404, 'Judgment not found', 'NOT_FOUND');
    }

    const { file_content: fileContent, file_type: fileType, ...details } = row;
    const isHtml = fileType === 'html' || /<\w+[^>]*>/.test(fileContent || '');
    res.json({
        success: true,
        judgment: {
            ...details,
            fullText: isHtml ? htmlToText(fileContent) : (fileContent || '').trim()
        }
    });
}));

module.exports = router;
