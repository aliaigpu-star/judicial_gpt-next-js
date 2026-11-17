const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// GET /api/quiz/questions — public (any logged-in user)
router.get('/questions', authenticate, asyncHandler(async (req, res) => {
    const result = await query(
        'SELECT id, question_text, option_a, option_b, option_c, option_d, question_order FROM quiz_questions ORDER BY question_order ASC, id ASC'
    );
    res.json({ questions: result.rows });
}));

// GET /api/quiz/questions/admin — includes correct_option (admin only)
router.get('/questions/admin', authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const result = await query(
        'SELECT * FROM quiz_questions ORDER BY question_order ASC, id ASC'
    );
    res.json({ questions: result.rows });
}));

// POST /api/quiz/questions — add question (admin only)
router.post('/questions', authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const { question_text, option_a, option_b, option_c, option_d, correct_option } = req.body;
    if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_option) {
        throw new ApiError(400, 'All fields required', 'MISSING_FIELDS');
    }
    if (!['a', 'b', 'c', 'd'].includes(correct_option)) {
        throw new ApiError(400, 'correct_option must be a, b, c or d', 'INVALID_OPTION');
    }
    const countResult = await query('SELECT COUNT(*) as count FROM quiz_questions');
    const order = parseInt(countResult.rows[0].count);
    const result = await query(
        'INSERT INTO quiz_questions (question_text, option_a, option_b, option_c, option_d, correct_option, question_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [question_text, option_a, option_b, option_c, option_d, correct_option, order]
    );
    res.status(201).json({ question: result.rows[0] });
}));

// PUT /api/quiz/questions/:id — update question (admin only)
router.put('/questions/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const { question_text, option_a, option_b, option_c, option_d, correct_option } = req.body;
    if (!['a', 'b', 'c', 'd'].includes(correct_option)) {
        throw new ApiError(400, 'correct_option must be a, b, c or d', 'INVALID_OPTION');
    }
    const result = await query(
        'UPDATE quiz_questions SET question_text=$1, option_a=$2, option_b=$3, option_c=$4, option_d=$5, correct_option=$6 WHERE id=$7 RETURNING *',
        [question_text, option_a, option_b, option_c, option_d, correct_option, req.params.id]
    );
    if (!result.rows.length) throw new ApiError(404, 'Question not found', 'NOT_FOUND');
    res.json({ question: result.rows[0] });
}));

// DELETE /api/quiz/questions/:id — delete question (admin only)
router.delete('/questions/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const result = await query('DELETE FROM quiz_questions WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) throw new ApiError(404, 'Question not found', 'NOT_FOUND');
    res.json({ success: true });
}));

// POST /api/quiz/submit — submit answers, returns score + per-question result
router.post('/submit', authenticate, asyncHandler(async (req, res) => {
    const { answers } = req.body; // { [questionId]: 'a'|'b'|'c'|'d' }
    if (!answers || typeof answers !== 'object') {
        throw new ApiError(400, 'answers object required', 'MISSING_ANSWERS');
    }
    const questionIds = Object.keys(answers).map(Number).filter(Boolean);
    if (!questionIds.length) throw new ApiError(400, 'No answers provided', 'EMPTY_ANSWERS');

    const result = await query(
        'SELECT id, correct_option FROM quiz_questions WHERE id = ANY($1)',
        [questionIds]
    );

    let score = 0;
    const breakdown = {};
    for (const q of result.rows) {
        const userAnswer = answers[q.id];
        const isCorrect = userAnswer === q.correct_option;
        if (isCorrect) score++;
        breakdown[q.id] = { correct: isCorrect, correct_option: q.correct_option, user_answer: userAnswer };
    }

    res.json({ score, total: result.rows.length, breakdown });
}));

module.exports = router;
