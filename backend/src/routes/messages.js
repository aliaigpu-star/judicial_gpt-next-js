/**
 * Message Routes
 * Handles message CRUD and versioning operations
 */

const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const config = require('../config/env');
const { MessageFeedback } = require('../models/MessageFeedback');

/**
 * Helper to verify user owns the conversation
 */
async function verifyConversationOwnership(conversationId, userId) {
    const conversation = await Conversation.findByIdForUser(conversationId, userId);
    if (!conversation) {
        throw new ApiError(404, 'Conversation not found', 'CONVERSATION_NOT_FOUND');
    }
    return conversation;
}

/**
 * POST /api/messages
 * Create a new message
 */
router.post('/', authenticate, asyncHandler(async (req, res) => {
    const { conversationId, role, content, responseTime, metadata } = req.body;

    if (!conversationId || !role || !content) {
        throw new ApiError(400, 'conversationId, role, and content are required', 'MISSING_FIELDS');
    }

    // Verify ownership
    await verifyConversationOwnership(conversationId, req.user.id);

    const message = await Message.create(conversationId, {
        role,
        content,
        responseTime,
        metadata
    });

    res.status(201).json({
        success: true,
        message: {
            id: message.id,
            role: message.role,
            content: message.content,
            responseTime: message.response_time,
            currentVersion: message.current_version,
            totalVersions: message.total_versions,
            createdAt: message.created_at
        }
    });
}));

/**
 * GET /api/messages/:id
 * Get a single message
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    const message = await Message.findById(req.params.id);

    if (!message) {
        throw new ApiError(404, 'Message not found', 'NOT_FOUND');
    }

    // Verify ownership via conversation
    await verifyConversationOwnership(message.conversation_id, req.user.id);

    res.json({
        message: {
            id: message.id,
            conversationId: message.conversation_id,
            role: message.role,
            content: message.content,
            responseTime: message.response_time,
            currentVersion: message.current_version,
            totalVersions: message.total_versions,
            metadata: message.metadata,
            createdAt: message.created_at
        }
    });
}));

/**
 * PUT /api/messages/:id
 * Update message content (creates a new version)
 */
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, 'Content is required', 'MISSING_CONTENT');
    }

    const message = await Message.findById(req.params.id);
    if (!message) {
        throw new ApiError(404, 'Message not found', 'NOT_FOUND');
    }

    // Verify ownership
    await verifyConversationOwnership(message.conversation_id, req.user.id);

    // Save as new version
    const updatedMessage = await Message.saveVersionAndUpdate(req.params.id, content);

    res.json({
        success: true,
        message: {
            id: updatedMessage.id,
            content: updatedMessage.content,
            currentVersion: updatedMessage.current_version,
            totalVersions: updatedMessage.total_versions
        }
    });
}));

/**
 * DELETE /api/messages/:id
 * Delete a message
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
    const message = await Message.findById(req.params.id);

    if (!message) {
        throw new ApiError(404, 'Message not found', 'NOT_FOUND');
    }

    // Verify ownership
    await verifyConversationOwnership(message.conversation_id, req.user.id);

    await Message.delete(req.params.id);

    res.json({
        success: true,
        message: 'Message deleted'
    });
}));

/**
 * GET /api/messages/:id/versions
 * Get all versions of a message
 */
router.get('/:id/versions', authenticate, asyncHandler(async (req, res) => {
    const message = await Message.findById(req.params.id);

    if (!message) {
        throw new ApiError(404, 'Message not found', 'NOT_FOUND');
    }

    // Verify ownership
    await verifyConversationOwnership(message.conversation_id, req.user.id);

    const versions = await Message.getVersions(req.params.id);

    // If no versions saved yet, return current content as version 1
    if (versions.length === 0) {
        return res.json({
            currentVersion: message.current_version,
            totalVersions: message.total_versions,
            versions: [{
                versionNumber: 1,
                content: message.content,
                createdAt: message.created_at
            }]
        });
    }

    res.json({
        currentVersion: message.current_version,
        totalVersions: message.total_versions,
        versions: versions.map(v => ({
            versionNumber: v.version_number,
            content: v.content,
            createdAt: v.created_at
        }))
    });
}));

/**
 * PATCH /api/messages/:id/versions/:version
 * Switch to a specific version
 */
router.patch('/:id/versions/:version', authenticate, asyncHandler(async (req, res) => {
    const versionNumber = parseInt(req.params.version);

    if (isNaN(versionNumber) || versionNumber < 1) {
        throw new ApiError(400, 'Invalid version number', 'INVALID_VERSION');
    }

    const message = await Message.findById(req.params.id);

    if (!message) {
        throw new ApiError(404, 'Message not found', 'NOT_FOUND');
    }

    // Verify ownership
    await verifyConversationOwnership(message.conversation_id, req.user.id);

    try {
        const updatedMessage = await Message.switchVersion(req.params.id, versionNumber);

        res.json({
            success: true,
            message: {
                id: updatedMessage.id,
                content: updatedMessage.content,
                currentVersion: updatedMessage.current_version
            }
        });
    } catch (error) {
        if (error.message === 'Version not found') {
            throw new ApiError(404, 'Version not found', 'VERSION_NOT_FOUND');
        }
        throw error;
    }
}));

/**
 * DELETE /api/messages
 * Delete multiple messages by IDs
 */
router.delete('/', authenticate, asyncHandler(async (req, res) => {
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
        throw new ApiError(400, 'messageIds array is required', 'MISSING_IDS');
    }

    // Verify all messages belong to user's conversations
    for (const id of messageIds) {
        const message = await Message.findById(id);
        if (message) {
            await verifyConversationOwnership(message.conversation_id, req.user.id);
        }
    }

    const deletedCount = await Message.deleteMany(messageIds);

    res.json({
        success: true,
        deletedCount
    });
}));

/**
 * POST /api/messages/:id/feedback
 * Set like/dislike feedback on a message. Body: { feedback, reasons?, comment? }.
 * Besides the flag on the message, a full record (question + answer snapshot,
 * reasons, model) is kept in message_feedback for review and training.
 */
router.post('/:id/feedback', authenticate, asyncHandler(async (req, res) => {
    const { feedback, reasons = [], comment = null } = req.body; // feedback: 'like', 'dislike', or null

    if (feedback && !['like', 'dislike'].includes(feedback)) {
        throw new ApiError(400, 'Feedback must be "like", "dislike", or null', 'INVALID_FEEDBACK');
    }
    if (!Array.isArray(reasons)) {
        throw new ApiError(400, 'Reasons must be an array', 'INVALID_FEEDBACK');
    }

    const message = await Message.findById(req.params.id);

    if (!message) {
        throw new ApiError(404, 'Message not found', 'NOT_FOUND');
    }

    // Verify ownership
    const conversation = await verifyConversationOwnership(message.conversation_id, req.user.id);

    const updatedMessage = await Message.setFeedback(req.params.id, feedback);

    // The feedback record is secondary: never fail the user's click because of it.
    try {
        if (feedback && message.role === 'assistant') {
            const geminiConfigured = req.app.locals.secrets?.GEMINI_API_KEY || config.GEMINI_API_KEY;
            await MessageFeedback.upsert({
                message: { ...message, content: updatedMessage?.content ?? message.content },
                conversation,
                userId: req.user.id,
                rating: feedback,
                reasons,
                comment,
                model: geminiConfigured ? config.GEMINI_MODEL : 'openai/gpt-oss-120b'
            });
        } else if (!feedback) {
            await MessageFeedback.remove(message.id, req.user.id);
        }
    } catch (err) {
        console.error('Failed to record message feedback:', err.message);
    }

    res.json({
        success: true,
        feedback: updatedMessage?.metadata?.feedback || null
    });
}));

module.exports = router;
