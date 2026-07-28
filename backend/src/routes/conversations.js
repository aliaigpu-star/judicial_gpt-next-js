/**
 * Conversation Routes
 * Handles conversation CRUD operations
 */

const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const ActivityLogger = require('../services/activityLogger');

/**
 * GET /api/conversations
 * Get all conversations for current user
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const includeArchived = req.query.archived === 'true';

    const conversations = await Conversation.findByUserId(req.user.id, { includeArchived });

    res.json({
        conversations: conversations.map(conv => ({
            id: conv.id,
            title: conv.title,
            model: conv.model,
            isPinned: conv.is_pinned,
            isArchived: conv.is_archived,
            messageCount: parseInt(conv.message_count) || 0,
            createdAt: conv.created_at,
            updatedAt: conv.updated_at
        }))
    });
}));

/**
 * POST /api/conversations
 * Create a new conversation
 */
router.post('/', authenticate, asyncHandler(async (req, res) => {
    const { title, model } = req.body;

    const conversation = await Conversation.create(req.user.id, { title, model });

    // Log conversation creation
    ActivityLogger.logConversationCreate(
        req.user.id,
        conversation.id,
        conversation.title,
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent']
    );

    res.status(201).json({
        success: true,
        conversation: {
            id: conversation.id,
            title: conversation.title,
            model: conversation.model,
            isPinned: conversation.is_pinned,
            isArchived: conversation.is_archived,
            messages: [],
            createdAt: conversation.created_at,
            updatedAt: conversation.updated_at
        }
    });
}));

/**
 * GET /api/conversations/:id
 * Get a conversation with messages
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    const conversation = await Conversation.findWithMessages(req.params.id, req.user.id);

    if (!conversation) {
        throw new ApiError(404, 'Conversation not found', 'NOT_FOUND');
    }

    res.json({
        conversation: {
            id: conversation.id,
            title: conversation.title,
            model: conversation.model,
            isPinned: conversation.is_pinned,
            isArchived: conversation.is_archived,
            messages: conversation.messages.map(msg => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                responseTime: msg.response_time,
                currentVersion: msg.current_version,
                totalVersions: msg.total_versions,
                metadata: msg.metadata,
                createdAt: msg.created_at
            })),
            createdAt: conversation.created_at,
            updatedAt: conversation.updated_at
        }
    });
}));

/**
 * PUT /api/conversations/:id
 * Update a conversation
 */
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
    const { title, model, isPinned, isArchived } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (model !== undefined) updates.model = model;
    if (isPinned !== undefined) updates.is_pinned = isPinned;
    if (isArchived !== undefined) updates.is_archived = isArchived;

    const conversation = await Conversation.update(req.params.id, req.user.id, updates);

    if (!conversation) {
        throw new ApiError(404, 'Conversation not found', 'NOT_FOUND');
    }

    res.json({
        success: true,
        conversation: {
            id: conversation.id,
            title: conversation.title,
            model: conversation.model,
            isPinned: conversation.is_pinned,
            isArchived: conversation.is_archived,
            updatedAt: conversation.updated_at
        }
    });
}));

/**
 * PATCH /api/conversations/:id/rename
 * Rename a conversation
 */
router.patch('/:id/rename', authenticate, asyncHandler(async (req, res) => {
    const { title } = req.body;

    if (!title) {
        throw new ApiError(400, 'Title is required', 'MISSING_TITLE');
    }

    const conversation = await Conversation.rename(req.params.id, req.user.id, title);

    if (!conversation) {
        throw new ApiError(404, 'Conversation not found', 'NOT_FOUND');
    }

    res.json({
        success: true,
        conversation: {
            id: conversation.id,
            title: conversation.title
        }
    });
}));

/**
 * PATCH /api/conversations/:id/pin
 * Toggle pin status
 */
router.patch('/:id/pin', authenticate, asyncHandler(async (req, res) => {
    const conversation = await Conversation.togglePin(req.params.id, req.user.id);

    if (!conversation) {
        throw new ApiError(404, 'Conversation not found', 'NOT_FOUND');
    }

    res.json({
        success: true,
        isPinned: conversation.is_pinned
    });
}));

/**
 * PATCH /api/conversations/:id/archive
 * Toggle archive status
 */
router.patch('/:id/archive', authenticate, asyncHandler(async (req, res) => {
    const conversation = await Conversation.toggleArchive(req.params.id, req.user.id);

    if (!conversation) {
        throw new ApiError(404, 'Conversation not found', 'NOT_FOUND');
    }

    res.json({
        success: true,
        isArchived: conversation.is_archived
    });
}));

/**
 * DELETE /api/conversations/:id
 * Delete a conversation
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
    const deleted = await Conversation.delete(req.params.id, req.user.id);

    if (!deleted) {
        throw new ApiError(404, 'Conversation not found', 'NOT_FOUND');
    }

    // Log conversation deletion
    ActivityLogger.logConversationDelete(
        req.user.id,
        req.params.id,
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent']
    );

    res.json({
        success: true,
        message: 'Conversation deleted'
    });
}));

/**
 * POST /api/conversations/archive-all
 * Archive all conversations for current user
 */
router.post('/archive-all', authenticate, asyncHandler(async (req, res) => {
    const archivedCount = await Conversation.archiveAllForUser(req.user.id);

    res.json({
        success: true,
        message: `Archived ${archivedCount} conversations`,
        count: archivedCount
    });
}));

/**
 * POST /api/conversations/unarchive-all
 * Unarchive all conversations for current user
 */
router.post('/unarchive-all', authenticate, asyncHandler(async (req, res) => {
    const unarchivedCount = await Conversation.unarchiveAllForUser(req.user.id);

    res.json({
        success: true,
        message: `Unarchived ${unarchivedCount} conversations`,
        count: unarchivedCount
    });
}));

/**
 * DELETE /api/conversations
 * Delete all conversations for current user
 */
router.delete('/', authenticate, asyncHandler(async (req, res) => {
    const deletedCount = await Conversation.deleteAllForUser(req.user.id);

    res.json({
        success: true,
        message: `Deleted ${deletedCount} conversations`
    });
}));

/**
 * GET /api/conversations/:id/messages
 * Get messages for a conversation
 */
router.get('/:id/messages', authenticate, asyncHandler(async (req, res) => {
    // Verify user owns the conversation
    const conversation = await Conversation.findByIdForUser(req.params.id, req.user.id);

    if (!conversation) {
        throw new ApiError(404, 'Conversation not found', 'NOT_FOUND');
    }

    const messages = await Message.findByConversationId(req.params.id);

    res.json({
        messages: messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            responseTime: msg.response_time,
            currentVersion: msg.current_version,
            totalVersions: msg.total_versions,
            metadata: msg.metadata,
            createdAt: msg.created_at
        }))
    });
}));

module.exports = router;
