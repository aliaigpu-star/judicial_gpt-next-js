const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// GET /api/billing/subscriptions
router.get('/subscriptions', authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const result = await query(`
        SELECT *, EXTRACT(DAY FROM (expiry_date - CURRENT_DATE))::integer as remaining_days
        FROM subscriptions ORDER BY expiry_date ASC NULLS LAST, created_at DESC
    `);
    res.json({ subscriptions: result.rows });
}));

// POST /api/billing/subscriptions
router.post('/subscriptions', authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const { service_name, category, billing_cycle, start_date, expiry_date, cost, currency, auto_renew, notes } = req.body;
    if (!service_name) throw new ApiError(400, 'service_name required');
    const result = await query(
        'INSERT INTO subscriptions (service_name, category, billing_cycle, start_date, expiry_date, cost, currency, auto_renew, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
        [service_name, category || 'Other', billing_cycle || 'Monthly', start_date || null, expiry_date || null, cost || 0, currency || 'USD', auto_renew || false, notes || null]
    );
    res.status(201).json({ subscription: result.rows[0] });
}));

// PUT /api/billing/subscriptions/:id
router.put('/subscriptions/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const { service_name, category, billing_cycle, start_date, expiry_date, cost, currency, auto_renew, notes } = req.body;
    if (!service_name) throw new ApiError(400, 'service_name required');
    const result = await query(
        'UPDATE subscriptions SET service_name=$1, category=$2, billing_cycle=$3, start_date=$4, expiry_date=$5, cost=$6, currency=$7, auto_renew=$8, notes=$9, updated_at=NOW() WHERE id=$10 RETURNING *',
        [service_name, category || 'Other', billing_cycle || 'Monthly', start_date || null, expiry_date || null, cost || 0, currency || 'USD', auto_renew || false, notes || null, req.params.id]
    );
    if (!result.rows.length) throw new ApiError(404, 'Subscription not found');
    res.json({ subscription: result.rows[0] });
}));

// DELETE /api/billing/subscriptions/:id
router.delete('/subscriptions/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const result = await query('DELETE FROM subscriptions WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) throw new ApiError(404, 'Subscription not found');
    res.json({ success: true });
}));

// GET /api/billing/alerts — subscriptions expiring within 15 days
router.get('/alerts', authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const result = await query(`
        SELECT *, EXTRACT(DAY FROM (expiry_date - CURRENT_DATE))::integer as remaining_days
        FROM subscriptions
        WHERE expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '15 days'
        ORDER BY expiry_date ASC
    `);
    res.json({ alerts: result.rows });
}));

// GET /api/billing/ai-usage?period=7d|30d|90d|all
router.get('/ai-usage', authenticate, requireAdmin, asyncHandler(async (req, res) => {
    const { period = '30d' } = req.query;
    const intervalMap = { '7d': '7 days', '30d': '30 days', '90d': '90 days' };
    const interval = intervalMap[period];
    const whereClause = interval ? `WHERE created_at >= NOW() - INTERVAL '${interval}'` : '';

    const [summary, byAgent, trend] = await Promise.all([
        query(`SELECT COUNT(*) as total_calls, COALESCE(SUM(total_tokens),0) as total_tokens, COALESCE(SUM(prompt_tokens),0) as total_prompt_tokens, COALESCE(SUM(completion_tokens),0) as total_completion_tokens, COALESCE(SUM(estimated_cost),0) as total_cost FROM ai_usage_logs ${whereClause}`),
        query(`SELECT agent_name, COUNT(*) as calls, COALESCE(SUM(total_tokens),0) as total_tokens, COALESCE(SUM(prompt_tokens),0) as prompt_tokens, COALESCE(SUM(completion_tokens),0) as completion_tokens, COALESCE(SUM(estimated_cost),0) as estimated_cost, MAX(created_at) as last_used FROM ai_usage_logs ${whereClause} GROUP BY agent_name ORDER BY total_tokens DESC`),
        query(`SELECT DATE(created_at) as date, COALESCE(SUM(total_tokens),0) as tokens, COALESCE(SUM(estimated_cost),0) as cost FROM ai_usage_logs WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date ASC`)
    ]);

    res.json({ summary: summary.rows[0], byAgent: byAgent.rows, trend: trend.rows });
}));

module.exports = router;
