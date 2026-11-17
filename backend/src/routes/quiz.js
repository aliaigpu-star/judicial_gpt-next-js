const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { generateGeminiReply } = require('../utils/gemini');
const config = require('../config/env');

// Grade a text answer using Gemini
async function gradeTextAnswer(questionText, expectedAnswer, userAnswer) {
    if (!userAnswer || !userAnswer.trim()) {
        return { score: 0, feedback: 'No answer provided.' };
    }
    if (!config.GEMINI_API_KEY) {
        return { score: 5, feedback: 'AI grading unavailable — no API key configured.' };
    }
    const prompt = `You are grading a quiz answer for a workshop on AI in the legal domain.

Question: ${questionText}
Expected answer (key points): ${expectedAnswer}
Student's answer: ${userAnswer}

Grade the student's answer on a scale of 0 to 10:
- 8-10: Captures the key points well, even if worded differently
- 5-7: Partially correct, missing some key points
- 1-4: Minimal understanding shown
- 0: Completely wrong or empty

Respond ONLY with valid JSON in this exact format (no extra text):
{"score": <number 0-10>, "feedback": "<1-2 sentences of constructive feedback>"}`;

    try {
        const { text } = await generateGeminiReply(config.GEMINI_API_KEY, {
            model: config.GEMINI_MODEL,
            systemPrompt: 'You are a strict but fair quiz grader. Respond only with valid JSON.',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            maxTokens: 200
        });
        const match = text.match(/\{[\s\S]*?\}/);
        if (match) {
            const result = JSON.parse(match[0]);
            return {
                score: Math.min(10, Math.max(0, Number(result.score) || 0)),
                feedback: String(result.feedback || '').trim()
            };
        }
    } catch (e) { /* ignore */ }
    return { score: 0, feedback: 'Unable to grade automatically.' };
}

// GET /api/quiz/questions — any logged-in user (no correct_option, no expected_answer)
router.get('/questions', authenticate, asyncHandler(async (req, res) => {
    const result = await query(
        'SELECT id, question_text, option_a, option_b, option_c, option_d, question_type, question_order FROM quiz_questions ORDER BY question_order ASC, id ASC'
    );
    res.json({ questions: result.rows });
}));

// GET /api/quiz/questions/admin — includes correct_option and expected_answer (admin only)
router.get('/questions/admin', authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const result = await query(
        'SELECT * FROM quiz_questions ORDER BY question_order ASC, id ASC'
    );
    res.json({ questions: result.rows });
}));

// POST /api/quiz/questions — add question (admin only)
router.post('/questions', authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const { question_text, option_a, option_b, option_c, option_d, correct_option, question_type, expected_answer } = req.body;
    const qtype = question_type || 'mcq';
    if (!question_text) throw new ApiError(400, 'question_text required', 'MISSING_FIELDS');
    if (qtype === 'mcq') {
        if (!option_a || !option_b || !option_c || !option_d || !correct_option)
            throw new ApiError(400, 'All MCQ fields required', 'MISSING_FIELDS');
        if (!['a', 'b', 'c', 'd'].includes(correct_option))
            throw new ApiError(400, 'correct_option must be a, b, c or d', 'INVALID_OPTION');
    } else {
        if (!expected_answer) throw new ApiError(400, 'expected_answer required for text questions', 'MISSING_FIELDS');
    }
    const countResult = await query('SELECT COUNT(*) as count FROM quiz_questions');
    const order = parseInt(countResult.rows[0].count);
    const result = await query(
        'INSERT INTO quiz_questions (question_text, option_a, option_b, option_c, option_d, correct_option, question_type, expected_answer, question_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
        [question_text, option_a || null, option_b || null, option_c || null, option_d || null, correct_option || null, qtype, expected_answer || null, order]
    );
    res.status(201).json({ question: result.rows[0] });
}));

// PUT /api/quiz/questions/:id — update question (admin only)
router.put('/questions/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const { question_text, option_a, option_b, option_c, option_d, correct_option, question_type, expected_answer } = req.body;
    const qtype = question_type || 'mcq';
    if (qtype === 'mcq' && correct_option && !['a', 'b', 'c', 'd'].includes(correct_option))
        throw new ApiError(400, 'correct_option must be a, b, c or d', 'INVALID_OPTION');
    const result = await query(
        'UPDATE quiz_questions SET question_text=$1, option_a=$2, option_b=$3, option_c=$4, option_d=$5, correct_option=$6, question_type=$7, expected_answer=$8 WHERE id=$9 RETURNING *',
        [question_text, option_a || null, option_b || null, option_c || null, option_d || null, correct_option || null, qtype, expected_answer || null, req.params.id]
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

// POST /api/quiz/submit — submit answers + personal info, grade MCQ + AI grade text questions
router.post('/submit', authenticate, asyncHandler(async (req, res) => {
    const { answers, name, personal_email, designation, posting, years_experience, contact_no, batch } = req.body;
    if (!answers || typeof answers !== 'object') throw new ApiError(400, 'answers object required', 'MISSING_ANSWERS');
    const questionIds = Object.keys(answers).map(Number).filter(Boolean);
    if (!questionIds.length) throw new ApiError(400, 'No answers provided', 'EMPTY_ANSWERS');

    const result = await query(
        'SELECT id, question_text, correct_option, question_type, expected_answer FROM quiz_questions WHERE id = ANY($1)',
        [questionIds]
    );

    let score = 0;
    const breakdown = {};
    const aiFeedbackMap = {};

    // Grade all questions in parallel (text questions call Gemini)
    await Promise.all(result.rows.map(async (q) => {
        const userAnswer = answers[q.id] || '';
        if (q.question_type === 'text') {
            const { score: aiScore, feedback } = await gradeTextAnswer(q.question_text, q.expected_answer, userAnswer);
            const isCorrect = aiScore >= 6;
            if (isCorrect) score++;
            breakdown[q.id] = { correct: isCorrect, question_type: 'text', user_answer: userAnswer, ai_score: aiScore, ai_feedback: feedback };
            aiFeedbackMap[q.id] = { ai_score: aiScore, feedback };
        } else {
            const isCorrect = userAnswer === q.correct_option;
            if (isCorrect) score++;
            breakdown[q.id] = { correct: isCorrect, correct_option: q.correct_option, question_type: 'mcq', user_answer: userAnswer };
        }
    }));

    await query(
        'INSERT INTO quiz_submissions (user_id, name, personal_email, designation, posting, years_experience, contact_no, batch, score, total, answers, ai_feedback) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
        [req.user.id, name, personal_email, designation, posting, years_experience, contact_no, batch || null, score, result.rows.length, JSON.stringify(answers), JSON.stringify(aiFeedbackMap)]
    );

    res.json({ score, total: result.rows.length, breakdown });
}));

// GET /api/quiz/submissions — view all submissions (admin only)
router.get('/submissions', authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const result = await query('SELECT * FROM quiz_submissions ORDER BY submitted_at DESC');
    res.json({ submissions: result.rows });
}));

module.exports = router;
