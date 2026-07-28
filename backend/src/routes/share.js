/**
 * Share Routes
 * Handles chat sharing operations
 */

const express = require('express');
const router = express.Router();
const SharedChat = require('../models/SharedChat');
const Conversation = require('../models/Conversation');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

/**
 * POST /api/share/:conversationId
 * Create or get share link for a conversation (requires auth)
 */
router.post('/:conversationId', authenticate, asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { expiresAt } = req.body;

    // Verify user owns the conversation
    const conversation = await Conversation.findByIdForUser(conversationId, req.user.id);
    if (!conversation) {
        throw new ApiError(404, 'Conversation not found', 'NOT_FOUND');
    }

    // Check if already shared
    let shared = await SharedChat.findByConversationId(conversationId);

    if (!shared) {
        // Create new share link
        shared = await SharedChat.create(conversationId, expiresAt || null);
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/shared/${shared.share_token}`;

    res.json({
        success: true,
        shareUrl,
        shareToken: shared.share_token,
        isActive: shared.is_active,
        viewCount: shared.view_count,
        createdAt: shared.created_at,
        expiresAt: shared.expires_at
    });
}));

/**
 * GET /api/share/:conversationId
 * Get share status for a conversation (requires auth)
 */
router.get('/:conversationId', authenticate, asyncHandler(async (req, res) => {
    const { conversationId } = req.params;

    // Verify user owns the conversation
    const conversation = await Conversation.findByIdForUser(conversationId, req.user.id);
    if (!conversation) {
        throw new ApiError(404, 'Conversation not found', 'NOT_FOUND');
    }

    const shared = await SharedChat.findByConversationId(conversationId);

    if (!shared) {
        return res.json({
            isShared: false
        });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/shared/${shared.share_token}`;

    res.json({
        isShared: true,
        shareUrl,
        shareToken: shared.share_token,
        isActive: shared.is_active,
        viewCount: shared.view_count,
        createdAt: shared.created_at,
        expiresAt: shared.expires_at
    });
}));

/**
 * DELETE /api/share/:conversationId
 * Revoke share link (requires auth)
 */
router.delete('/:conversationId', authenticate, asyncHandler(async (req, res) => {
    const { conversationId } = req.params;

    // Verify user owns the conversation
    const conversation = await Conversation.findByIdForUser(conversationId, req.user.id);
    if (!conversation) {
        throw new ApiError(404, 'Conversation not found', 'NOT_FOUND');
    }

    await SharedChat.revoke(conversationId);

    res.json({
        success: true,
        message: 'Share link revoked'
    });
}));

/**
 * GET /api/shared/:token
 * View shared chat (PUBLIC - no auth required)
 */
router.get('/view/:token', asyncHandler(async (req, res) => {
    const { token } = req.params;

    const sharedData = await SharedChat.getSharedMessages(token);

    if (!sharedData) {
        throw new ApiError(404, 'Shared chat not found or expired', 'NOT_FOUND');
    }

    // Return sanitized data - NO user info
    res.json({
        title: sharedData.title,
        model: sharedData.model,
        messages: sharedData.messages,
        viewCount: sharedData.viewCount,
        createdAt: sharedData.createdAt
    });
}));

module.exports = router;
