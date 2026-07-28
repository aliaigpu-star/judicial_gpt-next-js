/**
 * Activity Logger Service
 * Logs user actions and system events to activity_logs table
 */

const { query } = require('../config/database');

class ActivityLogger {
    /**
     * Log an activity
     * @param {Object} options
     * @param {string} options.userId - User ID (optional)
     * @param {string} options.action - Action name (e.g., 'user_login', 'user_register', 'conversation_create')
     * @param {string} options.entityType - Entity type (e.g., 'user', 'conversation')
     * @param {string} options.entityId - Entity ID
     * @param {Object} options.details - Additional details (JSON)
     * @param {string} options.ipAddress - IP address
     * @param {string} options.userAgent - User agent
     */
    static async log({
        userId = null,
        action,
        entityType = null,
        entityId = null,
        details = null,
        ipAddress = null,
        userAgent = null
    }) {
        try {
            await query(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    userId,
                    action,
                    entityType,
                    entityId,
                    details ? JSON.stringify(details) : null,
                    ipAddress,
                    userAgent
                ]
            );
        } catch (error) {
            // Don't throw - logging should not break the application
            console.error('Failed to log activity:', error);
        }
    }

    /**
     * Log user registration
     */
    static async logUserRegister(userId, email, ipAddress, userAgent) {
        return this.log({
            userId,
            action: 'user_register',
            entityType: 'user',
            entityId: userId,
            details: { email },
            ipAddress,
            userAgent
        });
    }

    /**
     * Log user login
     */
    static async logUserLogin(userId, email, ipAddress, userAgent) {
        return this.log({
            userId,
            action: 'user_login',
            entityType: 'user',
            entityId: userId,
            details: { email },
            ipAddress,
            userAgent
        });
    }

    /**
     * Log conversation creation
     */
    static async logConversationCreate(userId, conversationId, title, ipAddress, userAgent) {
        return this.log({
            userId,
            action: 'conversation_create',
            entityType: 'conversation',
            entityId: conversationId,
            details: { title },
            ipAddress,
            userAgent
        });
    }

    /**
     * Log conversation deletion
     */
    static async logConversationDelete(userId, conversationId, ipAddress, userAgent) {
        return this.log({
            userId,
            action: 'conversation_delete',
            entityType: 'conversation',
            entityId: conversationId,
            ipAddress,
            userAgent
        });
    }

    /**
     * Log user update
     */
    static async logUserUpdate(userId, updatedBy, changes, ipAddress, userAgent) {
        return this.log({
            userId: updatedBy,
            action: 'user_update',
            entityType: 'user',
            entityId: userId,
            details: { changes, updatedBy },
            ipAddress,
            userAgent
        });
    }

    /**
     * Log user deletion
     */
    static async logUserDelete(userId, deletedBy, ipAddress, userAgent) {
        return this.log({
            userId: deletedBy,
            action: 'user_delete',
            entityType: 'user',
            entityId: userId,
            details: { deletedBy },
            ipAddress,
            userAgent
        });
    }

    /**
     * Log admin action
     */
    static async logAdminAction(adminId, action, entityType, entityId, details, ipAddress, userAgent) {
        return this.log({
            userId: adminId,
            action: `admin_${action}`,
            entityType,
            entityId,
            details,
            ipAddress,
            userAgent
        });
    }
}

module.exports = ActivityLogger;
