/**
 * API Request Logger Service
 * Logs API requests to api_requests table
 */

const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

class ApiRequestLogger {
    /**
     * Log an API request
     * @param {Object} options
     * @param {string} options.requestId - Unique request ID
     * @param {string} options.apiKeyId - API key ID used
     * @param {string} options.userId - User ID (optional)
     * @param {string} options.sessionId - Session ID (optional)
     * @param {string} options.requestType - Request type (e.g., 'groq_chat', 'web_search', 'ocr', 'transcribe', 'pdf_read')
     * @param {string} options.endpoint - API endpoint
     * @param {string} options.method - HTTP method
     * @param {string} options.model - Model used (optional)
     * @param {string} options.status - Status: 'pending', 'success', 'failed'
     * @param {number} options.responseTime - Response time in ms
     * @param {number} options.tokensUsed - Tokens used (optional)
     * @param {number} options.statusCode - HTTP status code
     * @param {string} options.errorMessage - Error message (optional)
     * @param {string} options.ipAddress - IP address
     * @param {string} options.userAgent - User agent
     * @param {string} options.country - Country (optional)
     */
    static async log({
        requestId = uuidv4(),
        apiKeyId = null,
        userId = null,
        sessionId = null,
        requestType,
        endpoint,
        method = 'POST',
        model = null,
        status = 'pending',
        responseTime = null,
        tokensUsed = null,
        statusCode = null,
        errorMessage = null,
        ipAddress = null,
        userAgent = null,
        country = null
    }) {
        try {
            await query(
                `INSERT INTO api_requests (
                    id, timestamp, api_key_id, user_id, session_id, request_type,
                    endpoint, method, model, status, response_time, tokens_used,
                    status_code, error_message, ip_address, user_agent, country, completed_at
                ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
                [
                    requestId,
                    apiKeyId,
                    userId,
                    sessionId,
                    requestType,
                    endpoint,
                    method,
                    model,
                    status,
                    responseTime,
                    tokensUsed,
                    statusCode,
                    errorMessage,
                    ipAddress,
                    userAgent,
                    country,
                    status === 'success' || status === 'failed' ? new Date() : null
                ]
            );
            return requestId;
        } catch (error) {
            // Handle foreign key constraint violation (code 23503)
            // If the api_key_id doesn't exist, try to log without it
            if (error.code === '23503' && apiKeyId) {
                console.warn(`API key ${apiKeyId} not found in database. Logging request without API key link.`);
                return this.log({
                    requestId,
                    apiKeyId: null, // Set to null to avoid constraint
                    userId,
                    sessionId,
                    requestType,
                    endpoint,
                    method,
                    model,
                    status,
                    responseTime,
                    tokensUsed,
                    statusCode,
                    errorMessage,
                    ipAddress,
                    userAgent,
                    country
                });
            }
            // Don't throw - logging should not break the application
            console.error('Failed to log API request:', error.message);
            return null;
        }
    }

    /**
     * Update an existing API request log
     */
    static async update(requestId, updates) {
        try {
            const fields = [];
            const values = [];
            let paramIndex = 1;

            if (updates.status !== undefined) {
                fields.push(`status = $${paramIndex}`);
                values.push(updates.status);
                paramIndex++;
            }
            if (updates.responseTime !== undefined) {
                fields.push(`response_time = $${paramIndex}`);
                values.push(updates.responseTime);
                paramIndex++;
            }
            if (updates.tokensUsed !== undefined) {
                fields.push(`tokens_used = $${paramIndex}`);
                values.push(updates.tokensUsed);
                paramIndex++;
            }
            if (updates.statusCode !== undefined) {
                fields.push(`status_code = $${paramIndex}`);
                values.push(updates.statusCode);
                paramIndex++;
            }
            if (updates.errorMessage !== undefined) {
                fields.push(`error_message = $${paramIndex}`);
                values.push(updates.errorMessage);
                paramIndex++;
            }
            if (updates.completedAt !== undefined) {
                fields.push(`completed_at = $${paramIndex}`);
                values.push(updates.completedAt);
                paramIndex++;
            }

            if (fields.length === 0) return;

            values.push(requestId);
            await query(
                `UPDATE api_requests SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
                values
            );
        } catch (error) {
            console.error('Failed to update API request log:', error);
        }
    }
}

module.exports = ApiRequestLogger;
