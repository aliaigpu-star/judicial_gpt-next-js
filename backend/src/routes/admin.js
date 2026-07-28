/**
 * Admin Routes
 * Dashboard statistics and user/conversation management
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const ActivityLogger = require('../services/activityLogger');
const emailService = require('../services/emailService');

// Apply admin middleware to all routes
router.use(authenticate);
router.use(requireAdmin);

router.get('/dashboard', asyncHandler(async (req, res) => {
    // Get counts and time-based metrics in parallel
    const [
        userCount,
        conversationCount,
        messageCount,
        activeUsersTodayResult,
        activeUsersYesterdayResult,
        activeUsersWeeklyResult,
        activeUsersMonthlyResult,
        messagesTodayResult,
        messagesYesterdayResult,
        messagesWeeklyResult,
        messagesMonthlyResult,
        newUsersResult
    ] = await Promise.all([
        User.count(),
        Conversation.count(),
        Message.count(),
        query(`SELECT COUNT(DISTINCT user_id) as count FROM conversations WHERE updated_at >= NOW() - INTERVAL '24 hours'`),
        query(`SELECT COUNT(DISTINCT user_id) as count FROM conversations WHERE updated_at >= NOW() - INTERVAL '48 hours' AND updated_at < NOW() - INTERVAL '24 hours'`),
        query(`SELECT COUNT(DISTINCT user_id) as count FROM conversations WHERE updated_at >= NOW() - INTERVAL '7 days'`),
        query(`SELECT COUNT(DISTINCT user_id) as count FROM conversations WHERE updated_at >= NOW() - INTERVAL '30 days'`),
        query(`SELECT COUNT(*) as count FROM messages WHERE created_at >= NOW() - INTERVAL '24 hours'`),
        query(`SELECT COUNT(*) as count FROM messages WHERE created_at >= NOW() - INTERVAL '48 hours' AND created_at < NOW() - INTERVAL '24 hours'`),
        query(`SELECT COUNT(*) as count FROM messages WHERE created_at >= NOW() - INTERVAL '7 days'`),
        query(`SELECT COUNT(*) as count FROM messages WHERE created_at >= NOW() - INTERVAL '30 days'`),
        query(`SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`)
    ]);

    const activeUsers = parseInt(activeUsersTodayResult.rows[0]?.count) || 0;
    const activeUsersYesterday = parseInt(activeUsersYesterdayResult.rows[0]?.count) || 0;
    const activeUsersWeekly = parseInt(activeUsersWeeklyResult.rows[0]?.count) || 0;
    const activeUsersMonthly = parseInt(activeUsersMonthlyResult.rows[0]?.count) || 0;

    const messagesToday = parseInt(messagesTodayResult.rows[0]?.count) || 0;
    const messagesYesterday = parseInt(messagesYesterdayResult.rows[0]?.count) || 0;
    const messagesWeekly = parseInt(messagesWeeklyResult.rows[0]?.count) || 0;
    const messagesMonthly = parseInt(messagesMonthlyResult.rows[0]?.count) || 0;

    const newUsersWeek = parseInt(newUsersResult.rows[0]?.count) || 0;

    res.json({
        stats: {
            totalUsers: userCount,
            totalConversations: conversationCount,
            totalMessages: messageCount,
            activeUsers,
            activeUsersToday: activeUsers,
            activeUsersYesterday,
            activeUsersWeekly,
            activeUsersMonthly,
            messagesToday,
            messagesYesterday,
            messagesWeekly,
            messagesMonthly,
            newUsersWeek
        }
    });
}));

/**
 * GET /api/admin/users
 * Get all users with stats
 */
router.get('/users', asyncHandler(async (req, res) => {
    const users = await User.getAll();

    // Get stats for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
        const stats = await UserProfile.getStats(user.id);
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            emailVerified: user.email_verified,
            avatarUrl: user.avatar_url,
            conversationCount: parseInt(stats?.conversation_count) || 0,
            messageCount: parseInt(stats?.message_count) || 0,
            lastActivity: stats?.last_activity,
            createdAt: user.created_at
        };
    }));

    res.json({ users: usersWithStats });
}));

/**
 * GET /api/admin/users/:id
 * Get user details
 */
router.get('/users/:id', asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        throw new ApiError(404, 'User not found', 'NOT_FOUND');
    }

    const stats = await UserProfile.getStats(req.params.id);
    const conversations = await Conversation.findByUserId(req.params.id, { includeArchived: true });

    res.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            status: user.status,
            emailVerified: user.email_verified,
            avatarUrl: user.avatar_url,
            phoneNumber: user.phone_number,
            createdAt: user.created_at
        },
        stats: {
            conversationCount: parseInt(stats?.conversation_count) || 0,
            messageCount: parseInt(stats?.message_count) || 0,
            lastActivity: stats?.last_activity
        },
        conversations: conversations.slice(0, 10) // Last 10 conversations
    });
}));

/**
 * POST /api/admin/users
 * Create a new user (admin created)
 */
router.post('/users', asyncHandler(async (req, res) => {
    const { email, password, name, role, status } = req.body;

    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required', 'MISSING_FIELDS');
    }

    // Check if email exists
    const existing = await User.findByEmail(email);
    if (existing) {
        throw new ApiError(409, 'Email already registered', 'EMAIL_EXISTS');
    }

    // Create user
    const user = await User.create({
        email,
        password,
        name: name || email.split('@')[0]
    });

    // Update role and status if provided
    if (role) {
        await UserProfile.updateRole(user.id, role);
    }
    if (status) {
        await UserProfile.updateStatus(user.id, status);
    }

    res.status(201).json({
        success: true,
        user: {
            id: user.id,
            email: user.email
        }
    });
}));

/**
 * PUT /api/admin/users/:id
 * Update user
 */
router.put('/users/:id', asyncHandler(async (req, res) => {
    const { name, role, status } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
        throw new ApiError(404, 'User not found', 'NOT_FOUND');
    }

    // Track changes
    const changes = {};
    if (name !== undefined && name !== user.name) changes.name = { from: user.name, to: name };
    if (role !== undefined && role !== user.role) changes.role = { from: user.role, to: role };
    if (status !== undefined && status !== user.status) changes.status = { from: user.status, to: status };

    // Update profile
    if (name !== undefined) {
        await UserProfile.update(req.params.id, { name });
    }
    if (role !== undefined) {
        await UserProfile.updateRole(req.params.id, role);
    }
    if (status !== undefined) {
        await UserProfile.updateStatus(req.params.id, status);
    }

    const updatedUser = await User.findById(req.params.id);

    // Log user update
    if (Object.keys(changes).length > 0) {
        ActivityLogger.logUserUpdate(
            req.params.id,
            req.user.id,
            changes,
            req.ip || req.connection.remoteAddress,
            req.headers['user-agent']
        );
    }

    res.json({
        success: true,
        user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
            status: updatedUser.status
        }
    });
}));

/**
 * DELETE /api/admin/users/:id
 * Delete user and all data
 */
router.delete('/users/:id', asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        throw new ApiError(404, 'User not found', 'NOT_FOUND');
    }

    // Prevent deleting self
    if (req.params.id === req.user.id) {
        throw new ApiError(400, 'Cannot delete your own account', 'CANNOT_DELETE_SELF');
    }

    await User.delete(req.params.id);

    // Log user deletion
    ActivityLogger.logUserDelete(
        req.params.id,
        req.user.id,
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent']
    );

    res.json({
        success: true,
        message: 'User deleted'
    });
}));

/**
 * GET /api/admin/conversations
 * Get all conversations
 */
router.get('/conversations', asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const conversations = await Conversation.getAll({ limit, offset });

    res.json({
        conversations: conversations.map(c => ({
            id: c.id,
            title: c.title,
            userId: c.user_id,
            userName: c.user_name,
            userEmail: c.user_email,
            messageCount: parseInt(c.message_count) || 0,
            isPinned: c.is_pinned,
            isArchived: c.is_archived,
            createdAt: c.created_at,
            updatedAt: c.updated_at
        }))
    });
}));

/**
 * GET /api/admin/conversations/:id
 * Get conversation with messages
 */
router.get('/conversations/:id', asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
        throw new ApiError(404, 'Conversation not found', 'NOT_FOUND');
    }

    const messages = await Message.findByConversationId(req.params.id);
    const user = await User.findById(conversation.user_id);

    res.json({
        conversation: {
            id: conversation.id,
            title: conversation.title,
            user: user ? {
                id: user.id,
                email: user.email,
                name: user.name
            } : null,
            messages: messages.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: m.created_at
            })),
            createdAt: conversation.created_at,
            updatedAt: conversation.updated_at
        }
    });
}));

/**
 * DELETE /api/admin/conversations/:id
 * Delete any conversation
 */
router.delete('/conversations/:id', asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
        throw new ApiError(404, 'Conversation not found', 'NOT_FOUND');
    }

    await query('DELETE FROM conversations WHERE id = $1', [req.params.id]);

    res.json({
        success: true,
        message: 'Conversation deleted'
    });
}));

/**
 * GET /api/admin/activity
 * Get recent activity logs (conversations for dashboard)
 */
router.get('/activity', asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;

    const result = await query(
        `SELECT c.id, c.title, c.created_at, c.user_id,
            up.name as user_name, up.email as user_email
     FROM conversations c
     LEFT JOIN user_profiles up ON c.user_id = up.id
     ORDER BY c.created_at DESC
     LIMIT $1`,
        [limit]
    );

    res.json({
        activity: result.rows.map(row => ({
            id: row.id,
            type: 'conversation',
            title: row.title,
            user: row.user_name || row.user_email || 'Unknown',
            userId: row.user_id,
            timestamp: row.created_at
        }))
    });
}));

/**
 * GET /api/admin/logs/activity
 * Get activity logs from activity_logs table
 * If table is empty, generates logs from existing data
 */
router.get('/logs/activity', asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const actionFilter = req.query.action;
    const userIdFilter = req.query.userId;

    // Check if activity_logs table has any entries
    const countResult = await query('SELECT COUNT(*) as count FROM activity_logs');
    const logCount = parseInt(countResult.rows[0].count);

    // If table is empty or has very few entries, generate logs from existing data
    if (logCount < 10) {
        // Generate logs from users (registrations and logins)
        const users = await query(`
            SELECT u.id, up.email, up.name, u.created_at, s.created_at as last_login
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.id
            LEFT JOIN LATERAL (
                SELECT created_at FROM sessions 
                WHERE user_id = u.id 
                ORDER BY created_at DESC 
                LIMIT 1
            ) s ON true
            ORDER BY u.created_at DESC
            LIMIT 50
        `);

        for (const user of users.rows) {
            // Check if log already exists
            const existingLog = await query(
                'SELECT id FROM activity_logs WHERE user_id = $1 AND action = $2 AND entity_id = $3',
                [user.id, 'user_register', user.id]
            );

            if (existingLog.rows.length === 0) {
                // Log registration
                await ActivityLogger.log({
                    userId: user.id,
                    action: 'user_register',
                    entityType: 'user',
                    entityId: user.id,
                    details: { email: user.email }
                });

                // Log login if there's a session
                if (user.last_login) {
                    await ActivityLogger.log({
                        userId: user.id,
                        action: 'user_login',
                        entityType: 'user',
                        entityId: user.id,
                        details: { email: user.email }
                    });
                }
            }
        }

        // Generate logs from conversations
        const conversations = await query(`
            SELECT c.id, c.user_id, c.title, c.created_at, up.email, up.name
            FROM conversations c
            LEFT JOIN user_profiles up ON c.user_id = up.id
            ORDER BY c.created_at DESC
            LIMIT 50
        `);

        for (const conv of conversations.rows) {
            // Check if log already exists
            const existingLog = await query(
                'SELECT id FROM activity_logs WHERE user_id = $1 AND action = $2 AND entity_id = $3',
                [conv.user_id, 'conversation_create', conv.id]
            );

            if (existingLog.rows.length === 0) {
                await ActivityLogger.log({
                    userId: conv.user_id,
                    action: 'conversation_create',
                    entityType: 'conversation',
                    entityId: conv.id,
                    details: { title: conv.title }
                });
            }
        }
    }

    // Now fetch the logs
    let sql = `
        SELECT al.*, up.name as user_name, up.email as user_email
        FROM activity_logs al
        LEFT JOIN user_profiles up ON al.user_id = up.id
        WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (actionFilter) {
        sql += ` AND al.action = $${paramIndex}`;
        params.push(actionFilter);
        paramIndex++;
    }

    if (userIdFilter) {
        sql += ` AND al.user_id = $${paramIndex}`;
        params.push(userIdFilter);
        paramIndex++;
    }

    sql += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    res.json({
        logs: result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            userName: row.user_name,
            userEmail: row.user_email,
            action: row.action,
            entityType: row.entity_type,
            entityId: row.entity_id,
            details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : null,
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            timestamp: row.created_at
        })),
        total: result.rows.length,
        limit,
        offset
    });
}));

/**
 * GET /api/admin/logs/api-requests
 * Get API request logs
 */
router.get('/logs/api-requests', asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const statusFilter = req.query.status;
    const userIdFilter = req.query.userId;

    let sql = `
        SELECT ar.*, up.name as user_name, up.email as user_email
        FROM api_requests ar
        LEFT JOIN user_profiles up ON ar.user_id = up.id
        WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (statusFilter) {
        sql += ` AND ar.status = $${paramIndex}`;
        params.push(statusFilter);
        paramIndex++;
    }

    if (userIdFilter) {
        sql += ` AND ar.user_id = $${paramIndex}`;
        params.push(userIdFilter);
        paramIndex++;
    }

    sql += ` ORDER BY ar.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    res.json({
        logs: result.rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            apiKeyId: row.api_key_id,
            userId: row.user_id,
            userName: row.user_name,
            userEmail: row.user_email,
            sessionId: row.session_id,
            requestType: row.request_type,
            endpoint: row.endpoint,
            method: row.method,
            model: row.model,
            status: row.status,
            responseTime: row.response_time,
            tokensUsed: row.tokens_used,
            statusCode: row.status_code,
            errorMessage: row.error_message,
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            country: row.country,
            completedAt: row.completed_at
        })),
        total: result.rows.length,
        limit,
        offset
    });
}));

/**
 * GET /api/admin/system-status
 * Get system health status
 */
router.get('/system-status', asyncHandler(async (req, res) => {
    const checks = {
        database: false,
        api: true
    };

    // Check database
    try {
        await query('SELECT 1');
        checks.database = true;
    } catch (error) {
        checks.database = false;
    }

    res.json({
        status: Object.values(checks).every(v => v) ? 'healthy' : 'degraded',
        checks,
        timestamp: new Date().toISOString()
    });
}));

/**
 * GET /api/admin/search
 * Search users and conversations
 */
router.get('/search', asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
        throw new ApiError(400, 'Search query must be at least 2 characters', 'INVALID_QUERY');
    }

    const [users, conversations] = await Promise.all([
        UserProfile.search(q, 20),
        Conversation.search(q, { limit: 20 })
    ]);

    res.json({
        users: users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status
        })),
        conversations: conversations.map(c => ({
            id: c.id,
            title: c.title,
            userName: c.user_name,
            userEmail: c.user_email,
            updatedAt: c.updated_at
        }))
    });
}));

/**
 * GET /api/admin/settings
 * Get system settings (including SMTP)
 */
router.get('/settings', asyncHandler(async (req, res) => {
    let result = await query(
        'SELECT * FROM system_settings WHERE id = $1',
        ['00000000-0000-0000-0000-000000000001']
    );

    // If settings don't exist, create default ones
    if (result.rows.length === 0) {
        await query(
            `INSERT INTO system_settings (
                id, smtp_enabled, require_email_verification, 
                smtp_host, smtp_port, smtp_secure, smtp_from_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            ['00000000-0000-0000-0000-000000000001', true, false, 'smtp.gmail.com', 587, true, 'Judicial GPT']
        );
        
        // Fetch the newly created settings
        result = await query(
            'SELECT * FROM system_settings WHERE id = $1',
            ['00000000-0000-0000-0000-000000000001']
        );
    }

    const settings = result.rows[0];
    
    // Don't send sensitive SMTP password to frontend
    const sanitizedSettings = {
        ...settings,
        smtp_password: settings.smtp_password ? '••••••••' : null
    };

    res.json({
        success: true,
        settings: sanitizedSettings
    });
}));

/**
 * PUT /api/admin/settings
 * Update system settings (including SMTP)
 */
router.put('/settings', asyncHandler(async (req, res) => {
    // Get all settings from request body
    const {
        smtp_enabled,
        smtp_host,
        smtp_port,
        smtp_secure,
        smtp_user,
        smtp_password,
        smtp_from_email,
        smtp_from_name,
        require_email_verification
    } = req.body;

    console.log('📝 Updating system settings:', {
        smtp_enabled,
        smtp_host,
        smtp_port,
        smtp_secure,
        smtp_user: smtp_user ? `${smtp_user.substring(0, 3)}***` : 'not provided',
        smtp_password: smtp_password ? '***' : 'not provided',
        smtp_from_email,
        smtp_from_name,
        require_email_verification
    });

    // Prepare update data
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (smtp_enabled !== undefined) {
        updateFields.push(`smtp_enabled = $${paramIndex++}`);
        updateValues.push(smtp_enabled);
    }
    if (smtp_host !== undefined) {
        updateFields.push(`smtp_host = $${paramIndex++}`);
        updateValues.push(smtp_host || null);
    }
    if (smtp_port !== undefined) {
        updateFields.push(`smtp_port = $${paramIndex++}`);
        updateValues.push(smtp_port);
    }
    if (smtp_secure !== undefined) {
        updateFields.push(`smtp_secure = $${paramIndex++}`);
        updateValues.push(smtp_secure);
    }
    if (smtp_user !== undefined) {
        updateFields.push(`smtp_user = $${paramIndex++}`);
        updateValues.push(smtp_user || null);
    }
    // Only update password if it's not the masked value
    if (smtp_password !== undefined && smtp_password !== '••••••••') {
        updateFields.push(`smtp_password = $${paramIndex++}`);
        updateValues.push(smtp_password);
    }
    if (smtp_from_email !== undefined) {
        updateFields.push(`smtp_from_email = $${paramIndex++}`);
        updateValues.push(smtp_from_email || null);
    }
    if (smtp_from_name !== undefined) {
        updateFields.push(`smtp_from_name = $${paramIndex++}`);
        updateValues.push(smtp_from_name || null);
    }
    if (require_email_verification !== undefined) {
        updateFields.push(`require_email_verification = $${paramIndex++}`);
        updateValues.push(require_email_verification);
    }

    if (updateFields.length === 0) {
        throw new ApiError(400, 'No fields to update', 'NO_FIELDS');
    }

    // Add updated_by and updated_at
    updateFields.push(`updated_by = $${paramIndex++}`);
    updateValues.push(req.user.id);
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add the WHERE clause parameter
    updateValues.push('00000000-0000-0000-0000-000000000001');

    const updateQuery = `
        UPDATE system_settings 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
    `;

    const result = await query(updateQuery, updateValues);

    if (result.rows.length === 0) {
        throw new ApiError(404, 'System settings not found', 'SETTINGS_NOT_FOUND');
    }

    // Try to reinitialize email service if SMTP settings changed (non-blocking)
    // Don't fail the save operation if email service initialization fails
    let emailServiceWarning = null;
    if (smtp_enabled !== undefined || smtp_host !== undefined || smtp_user !== undefined || smtp_password !== undefined) {
        try {
            console.log('📧 Attempting to reinitialize email service after settings update...');
            await emailService.initialize(true); // Force reinitialize
            console.log('✅ Email service reinitialized successfully');
        } catch (error) {
            // Log the error but don't fail the save operation
            console.error('⚠️ Email service reinitialization failed, but settings were saved:');
            console.error(`   Error: ${error.message}`);
            console.error(`   Code: ${error.code || 'N/A'}`);
            emailServiceWarning = `Settings saved successfully, but email service initialization failed: ${error.message}. Please check your SMTP configuration.`;
        }
    }

    // Log the update
    ActivityLogger.logUserUpdate(
        req.user.id,
        req.user.id,
        { action: 'update_system_settings', fields: Object.keys(req.body) },
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent']
    );

    const settings = result.rows[0];
    const sanitizedSettings = {
        ...settings,
        smtp_password: settings.smtp_password ? '••••••••' : null
    };

    res.json({
        success: true,
        message: emailServiceWarning ? 'Settings updated successfully, but email service needs attention' : 'Settings updated successfully',
        settings: sanitizedSettings,
        warning: emailServiceWarning || undefined
    });
}));

/**
 * POST /api/admin/settings/test-smtp
 * Test SMTP configuration
 */
router.post('/settings/test-smtp', asyncHandler(async (req, res) => {
    const { testEmail } = req.body;

    if (!testEmail) {
        throw new ApiError(400, 'Test email address is required', 'MISSING_EMAIL');
    }

    try {
        // Force reinitialize email service
        await emailService.initialize(true);
        
        if (!emailService.transporter) {
            throw new ApiError(500, 'SMTP is not configured or connection failed', 'SMTP_NOT_CONFIGURED');
        }

        // Send test email
        const result = await emailService.sendEmail({
            to: testEmail,
            subject: '🧪 SMTP Test Email - Judicial GPT',
            html: `
                <h2>✅ SMTP Test Successful!</h2>
                <p>This is a test email to verify your SMTP configuration is working correctly.</p>
                <p>Time: ${new Date().toISOString()}</p>
                <p>If you received this email, your SMTP settings are configured correctly.</p>
            `,
            text: `SMTP Test Successful! This is a test email sent at ${new Date().toISOString()}`
        });

        if (result.success) {
            res.json({
                success: true,
                message: 'Test email sent successfully!',
                messageId: result.messageId
            });
        } else {
            throw new ApiError(500, result.error || 'Failed to send test email', 'EMAIL_SEND_FAILED');
        }
    } catch (error) {
        console.error('SMTP test error:', error);
        throw new ApiError(500, error.message || 'Failed to test SMTP configuration', 'SMTP_TEST_FAILED');
    }
}));

module.exports = router;
