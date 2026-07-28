/**
 * User Routes
 * Handles user profile operations
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const UserProfile = require('../models/UserProfile');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const config = require('../config/env');

// Configure multer for avatar uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/avatars');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${req.user.id}-${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: config.MAX_FILE_SIZE
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new ApiError(400, 'Invalid file type. Only JPEG, PNG, and WebP are allowed.', 'INVALID_FILE_TYPE'));
        }
    }
});

/**
 * GET /api/users/profile
 * Get current user's profile
 */
router.get('/profile', authenticate, asyncHandler(async (req, res) => {
    const profile = await UserProfile.findByUserId(req.user.id);

    if (!profile) {
        throw new ApiError(404, 'Profile not found', 'PROFILE_NOT_FOUND');
    }

    const stats = await UserProfile.getStats(req.user.id);

    res.json({
        profile: {
            id: profile.id,
            name: profile.name,
            firstName: profile.first_name,
            lastName: profile.last_name,
            email: profile.email,
            phoneNumber: profile.phone_number,
            countryCode: profile.country_code,
            avatarUrl: profile.avatar_url,
            role: profile.role,
            status: profile.status,
            emailVerified: profile.email_verified,
            preferences: profile.preferences,
            createdAt: profile.created_at
        },
        stats: {
            conversationCount: parseInt(stats.conversation_count) || 0,
            messageCount: parseInt(stats.message_count) || 0,
            lastActivity: stats.last_activity
        }
    });
}));

/**
 * PUT /api/users/profile
 * Update current user's profile
 */
router.put('/profile', authenticate, asyncHandler(async (req, res) => {
    const { name, firstName, lastName, phoneNumber, countryCode, preferences } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (phoneNumber !== undefined) updates.phone_number = phoneNumber;
    if (countryCode !== undefined) updates.country_code = countryCode;
    if (preferences !== undefined) updates.preferences = JSON.stringify(preferences);

    const profile = await UserProfile.update(req.user.id, updates);

    if (!profile) {
        throw new ApiError(404, 'Profile not found', 'PROFILE_NOT_FOUND');
    }

    res.json({
        success: true,
        profile: {
            id: profile.id,
            name: profile.name,
            firstName: profile.first_name,
            lastName: profile.last_name,
            phoneNumber: profile.phone_number,
            countryCode: profile.country_code,
            avatarUrl: profile.avatar_url,
            preferences: profile.preferences
        }
    });
}));

/**
 * POST /api/users/avatar
 * Upload avatar image
 */
router.post('/avatar', authenticate, upload.single('avatar'), asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'No file uploaded', 'NO_FILE');
    }

    // Get current profile to check for existing avatar
    const currentProfile = await UserProfile.findByUserId(req.user.id);

    // Delete old avatar file if exists
    if (currentProfile && currentProfile.avatar_url) {
        const oldPath = currentProfile.avatar_url.replace('/uploads/', '');
        const fullPath = path.join(__dirname, '../../uploads', oldPath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    }

    // Build relative URL for the new avatar to support proxying and avoid mixed content
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Update profile
    const profile = await UserProfile.updateAvatar(req.user.id, avatarUrl);

    res.json({
        success: true,
        avatarUrl: profile.avatar_url
    });
}));

/**
 * DELETE /api/users/avatar
 * Remove avatar image
 */
router.delete('/avatar', authenticate, asyncHandler(async (req, res) => {
    const currentProfile = await UserProfile.findByUserId(req.user.id);

    // Delete avatar file if exists
    if (currentProfile && currentProfile.avatar_url) {
        const avatarPath = currentProfile.avatar_url.replace('/uploads/', '');
        const fullPath = path.join(__dirname, '../../uploads', avatarPath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    }

    await UserProfile.removeAvatar(req.user.id);

    res.json({
        success: true,
        message: 'Avatar removed'
    });
}));

/**
 * GET /api/users/stats
 * Get user statistics
 */
router.get('/stats', authenticate, asyncHandler(async (req, res) => {
    const stats = await UserProfile.getStats(req.user.id);

    res.json({
        conversationCount: parseInt(stats.conversation_count) || 0,
        messageCount: parseInt(stats.message_count) || 0,
        lastActivity: stats.last_activity
    });
}));

module.exports = router;
