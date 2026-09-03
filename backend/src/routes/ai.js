/**
 * AI Chat Routes
 * Handles Groq API proxy for chat completions
 */

const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const { authenticate } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimit');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const config = require('../config/env');
const ApiRequestLogger = require('../services/apiRequestLogger');
const { truncateMessages } = require('../utils/ai');

// API Key Manager for load balancing
class ApiKeyManager {
    constructor(keys) {
        this.keys = keys.map((key, index) => ({
            id: `key_${index + 1}`,
            key: key.trim(),
            requestCount: 0,
            failureCount: 0,
            lastUsed: null,
            status: 'active'
        }));
    }

    getKey(strategy = 'round-robin') {
        const activeKeys = this.keys.filter(k => k.status === 'active');

        if (activeKeys.length === 0) {
            // Try degraded keys
            const degradedKeys = this.keys.filter(k => k.status === 'degraded');
            if (degradedKeys.length === 0) {
                return null;
            }
            return degradedKeys[Math.floor(Math.random() * degradedKeys.length)];
        }

        if (strategy === 'random') {
            return activeKeys[Math.floor(Math.random() * activeKeys.length)];
        }

        // Round-robin: get least used
        activeKeys.sort((a, b) => a.requestCount - b.requestCount);
        return activeKeys[0];
    }

    recordSuccess(keyId, responseTime, tokensUsed) {
        const key = this.keys.find(k => k.id === keyId);
        if (key) {
            key.requestCount++;
            key.lastUsed = Date.now();
            key.failureCount = 0;
            if (key.status === 'degraded') {
                key.status = 'active';
            }
        }
    }

    recordFailure(keyId, error) {
        const key = this.keys.find(k => k.id === keyId);
        if (key) {
            key.failureCount++;
            key.lastUsed = Date.now();

            if (key.failureCount >= 3) {
                key.status = 'degraded';
            }
            if (key.failureCount >= 10) {
                key.status = 'blocked';
            }
        }
    }
}

// Initialize API key manager lazily to access req.app.locals
let keyManager = null;
function getKeyManager(req) {
    if (!keyManager) {
        const apiKey = req.app?.locals?.secrets?.GROQ_API_KEY;
        const apiKeys = apiKey ? [apiKey] : [];
        keyManager = new ApiKeyManager(apiKeys);
    }
    return keyManager;
}

// Judicial system prompt
const JUDICIAL_SYSTEM_PROMPT = `You are JudicialGPT, an advanced AI legal assistant designed to provide comprehensive legal research, analysis, and guidance. You specialize in:

1. Legal Research & Analysis
   - Analyzing statutes, case law, and legal precedents
   - Providing detailed legal explanations
   - Identifying relevant laws and regulations

2. Legal Document Assistance
   - Drafting and reviewing legal documents
   - Explaining legal terminology
   - Suggesting document improvements

3. Case Analysis
   - Analyzing case facts and circumstances
   - Identifying potential legal issues
   - Suggesting legal strategies

4. Legal Education
   - Explaining complex legal concepts
   - Providing historical legal context
   - Discussing legal principles and theories

Guidelines:
- Match your response length to the complexity of the question
- For simple greetings like "hi", "hello", or "hey", respond briefly and warmly (1-2 sentences)
- For legal questions, provide comprehensive, well-researched answers
- Cite relevant laws, statutes, or cases when applicable
- Clarify when you're providing general guidance vs. specific legal advice
- Recommend consulting with a licensed attorney for specific legal matters
- Maintain professional, clear, and respectful communication
- When arguing or resolving any legal issue, discuss the facts of both sides thoroughly, then take one clear, definitive position based on the law and evidence
- Format responses with proper headings and structure only for complex topics`;

/**
 * Validate chat request body
 */
function validateChatRequest(body) {
    if (!body || typeof body !== 'object') {
        return { valid: false, error: 'Invalid request body' };
    }

    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return { valid: false, error: 'Messages array is required and must not be empty' };
    }

    for (const msg of messages) {
        if (!msg.role || !msg.content) {
            return { valid: false, error: 'Each message must have role and content' };
        }
        if (!['user', 'assistant', 'system'].includes(msg.role)) {
            return { valid: false, error: 'Invalid message role' };
        }
    }

    return { valid: true };
}

/**
 * POST /api/ai/chat
 * Send message to Groq API
 */
router.post('/chat', authenticate, aiRateLimiter, asyncHandler(async (req, res) => {
    const validation = validateChatRequest(req.body);
    if (!validation.valid) {
        throw new ApiError(400, validation.error, 'INVALID_REQUEST');
    }

    const {
        messages,
        model = 'llama-3.3-70b-versatile',
        temperature = 0.7,
        maxTokens = 4000,
        stream = false
    } = req.body;

    // Enforce a sensible server-side cap for maxTokens to prevent 413 errors
    const effectiveMaxTokens = Math.min(maxTokens, 4000);

    // Get API key
    const km = getKeyManager(req);
    const selectedKey = km.getKey('random');

    if (!selectedKey || !selectedKey.key) {
        throw new ApiError(500, 'AI service temporarily unavailable', 'NO_API_KEY');
    }

    // Truncate messages to fit within token limit (approximate)
    // Most Groq models support at least 32k context. We'll aim for 10k history tokens.
    const truncatedMessages = truncateMessages(messages, 10000);

    const startTime = Date.now();
    const requestId = await ApiRequestLogger.log({
        apiKeyId: selectedKey.id,
        userId: req.user?.id,
        requestType: 'groq_chat',
        endpoint: '/api/ai/chat',
        method: 'POST',
        model,
        status: 'pending',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
    });

    try {
        const groq = new Groq({ apiKey: selectedKey.key });

        // Construct system prompt with user customizations
        let systemPrompt = JUDICIAL_SYSTEM_PROMPT;
        if (req.user?.preferences?.custom_instructions) {
            systemPrompt += `\n\nUser Custom Instructions:\n${req.user.preferences.custom_instructions}\n\nPlease prioritize these instructions above unrelated guidelines.`;
        }

        // Prepend system prompt if not already present
        const hasSystemPrompt = messages.some(m => m.role === 'system');
        const messagesWithSystem = hasSystemPrompt
            ? truncatedMessages
            : [{ role: 'system', content: systemPrompt }, ...truncatedMessages];

        if (stream) {
            // Streaming response
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const completion = await groq.chat.completions.create({
                model,
                messages: messagesWithSystem,
                temperature,
                max_tokens: effectiveMaxTokens,
                stream: true
            });

            for await (const chunk of completion) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    res.write(`data: ${JSON.stringify({ content })}\n\n`);
                }
            }

            const responseTime = Date.now() - startTime;
            km.recordSuccess(selectedKey.id, responseTime, 0);

            // Update log
            if (requestId) {
                await ApiRequestLogger.update(requestId, {
                    status: 'success',
                    responseTime,
                    statusCode: 200,
                    completedAt: new Date()
                });
            }

            res.write(`data: ${JSON.stringify({ done: true, responseTime })}\n\n`);
            res.end();
        } else {
            // Non-streaming response
            const completion = await groq.chat.completions.create({
                model,
                messages: messagesWithSystem,
                temperature,
                max_tokens: effectiveMaxTokens,
                stream: false
            });

            const responseTime = Date.now() - startTime;
            const tokensUsed = completion.usage?.total_tokens || 0;

            km.recordSuccess(selectedKey.id, responseTime, tokensUsed);

            // Update log
            if (requestId) {
                await ApiRequestLogger.update(requestId, {
                    status: 'success',
                    responseTime,
                    tokensUsed,
                    statusCode: 200,
                    completedAt: new Date()
                });
            }

            res.json({
                success: true,
                message: {
                    role: 'assistant',
                    content: completion.choices[0]?.message?.content || ''
                },
                usage: completion.usage,
                responseTime,
                model: completion.model
            });
        }
    } catch (error) {
        km.recordFailure(selectedKey.id, error);

        // Update log
        if (requestId) {
            const statusCode = error.status || 500;
            await ApiRequestLogger.update(requestId, {
                status: 'failed',
                responseTime: Date.now() - startTime,
                statusCode,
                errorMessage: error.message || 'Unknown error',
                completedAt: new Date()
            });
        }

        console.error('Groq API error details:', {
            message: error.message,
            status: error.status,
            stack: error.stack,
            apiKeyId: selectedKey?.id
        });

        if (error.status === 429) {
            throw new ApiError(429, 'Rate limit exceeded. Please try again later.', 'RATE_LIMIT');
        }

        if (error.message?.includes('token') || error.message?.includes('context length')) {
            throw new ApiError(400, 'Message is too long. Please start a new conversation.', 'TOKEN_LIMIT');
        }

        throw new ApiError(500, 'Failed to generate response. Please try again.', 'AI_ERROR');
    }
}));

/**
 * POST /api/ai/web-search
 * AI chat with web search capability
 */
router.post('/web-search', authenticate, aiRateLimiter, asyncHandler(async (req, res) => {
    const { query } = req.body;

    if (!query) {
        throw new ApiError(400, 'Query is required', 'MISSING_QUERY');
    }

    const startTime = Date.now();
    let requestId = null;

    // If external web search API is configured, use it
    if (config.WEB_SEARCH_API_URL) {
        try {
            // Call the /ask endpoint with 'question' parameter (as expected by JudicialGPT Web Agent)
            const searchUrl = config.WEB_SEARCH_API_URL.replace(/\/$/, '') + '/ask';
            console.log('Calling web search API:', searchUrl);

            requestId = await ApiRequestLogger.log({
                userId: req.user?.id,
                requestType: 'web_search',
                endpoint: '/api/ai/web-search',
                method: 'POST',
                status: 'pending',
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent']
            });

            const searchResponse = await fetch(searchUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: query })
            });

            const responseTime = Date.now() - startTime;

            if (searchResponse.ok) {
                const data = await searchResponse.json();

                // Update log
                if (requestId) {
                    await ApiRequestLogger.update(requestId, {
                        status: 'success',
                        responseTime,
                        statusCode: 200,
                        completedAt: new Date()
                    });
                }

                return res.json({
                    success: true,
                    answer: data.answer || data.response || '',
                    sources: data.sources || [],
                    mode: 'web-search',
                    responseTime: data.responseTime || responseTime
                });
            } else {
                const errorText = await searchResponse.text();
                console.error('Web search API returned:', searchResponse.status, errorText);

                // Update log
                if (requestId) {
                    await ApiRequestLogger.update(requestId, {
                        status: 'failed',
                        responseTime,
                        statusCode: searchResponse.status,
                        errorMessage: errorText,
                        completedAt: new Date()
                    });
                }
            }
        } catch (error) {
            console.error('Web search API error:', error.message);

            // Update log
            if (requestId) {
                await ApiRequestLogger.update(requestId, {
                    status: 'failed',
                    responseTime: Date.now() - startTime,
                    statusCode: 500,
                    errorMessage: error.message,
                    completedAt: new Date()
                });
            }
        }
    }

    // Fallback to Groq with web search prompt
    const km = getKeyManager(req);
    const selectedKey = km.getKey('random');

    if (!selectedKey || !selectedKey.key) {
        throw new ApiError(500, 'AI service temporarily unavailable', 'NO_API_KEY');
    }

    // Log if not already logged
    if (!requestId) {
        requestId = await ApiRequestLogger.log({
            apiKeyId: selectedKey.id,
            userId: req.user?.id,
            requestType: 'groq_chat',
            endpoint: '/api/ai/web-search',
            method: 'POST',
            model: 'llama-3.3-70b-versatile',
            status: 'pending',
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
        });
    }

    const groq = new Groq({ apiKey: selectedKey.key });

    try {
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `${JUDICIAL_SYSTEM_PROMPT}${req.user?.preferences?.custom_instructions ? `\n\nUser Custom Instructions:\n${req.user.preferences.custom_instructions}\n\nPlease prioritize these instructions above unrelated guidelines.` : ''}\n\nNote: The user has requested a web search. Since you don't have real-time internet access, provide the most comprehensive and up-to-date information you have from your training data. Clearly indicate the date of your knowledge cutoff if relevant.`
                },
                { role: 'user', content: query }
            ],
            temperature: 0.5,
            max_tokens: 4000
        });

        const responseTime = Date.now() - startTime;
        const tokensUsed = completion.usage?.total_tokens || 0;
        km.recordSuccess(selectedKey.id, responseTime, tokensUsed);

        // Update log
        if (requestId) {
            await ApiRequestLogger.update(requestId, {
                status: 'success',
                responseTime,
                tokensUsed,
                statusCode: 200,
                completedAt: new Date()
            });
        }

        res.json({
            success: true,
            answer: completion.choices[0]?.message?.content || '',
            mode: 'fallback',
            sources: [],
            responseTime
        });
    } catch (error) {
        km.recordFailure(selectedKey.id, error);

        // Update log
        if (requestId) {
            await ApiRequestLogger.update(requestId, {
                status: 'failed',
                responseTime: Date.now() - startTime,
                statusCode: error.status || 500,
                errorMessage: error.message || 'Unknown error',
                completedAt: new Date()
            });
        }

        throw new ApiError(500, 'Failed to generate response. Please try again.', 'AI_ERROR');
    }
}));

/**
 * GET /api/ai/status
 * Get AI service status
 */
router.get('/status', authenticate, asyncHandler(async (req, res) => {
    const km = getKeyManager(req);
    const activeKeys = km.keys.filter(k => k.status === 'active').length;
    const totalKeys = km.keys.length;

    res.json({
        status: activeKeys > 0 ? 'operational' : 'degraded',
        activeKeys,
        totalKeys,
        models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'llama-3.1-8b-instant']
    });
}));
/**
 * POST /api/ai/generate-title
 * Generate a smart, descriptive conversation title from the first message
 */
router.post('/generate-title', authenticate, asyncHandler(async (req, res) => {
    const { message } = req.body;

    if (!message) {
        throw new ApiError(400, 'Message is required', 'MISSING_MESSAGE');
    }

    const km = getKeyManager(req);
    const selectedKey = km.getKey('random');

    if (!selectedKey || !selectedKey.key) {
        // Fallback to simple title if AI unavailable
        const fallbackTitle = message.slice(0, 40) + (message.length > 40 ? '...' : '');
        return res.json({ success: true, title: fallbackTitle });
    }

    try {
        const groq = new Groq({ apiKey: selectedKey.key });

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are a title generator. Create a short, descriptive title (2-5 words maximum) that summarizes the main topic or intent of the user's message. 
                    
Rules:
- Output ONLY the title, nothing else
- No quotes or punctuation at the end
- Be concise and descriptive
- Use title case
- Focus on the main subject/action
- For simple greetings (hi, hello, hey), create a friendly title like "Friendly Hello", "Quick Chat", "Getting Started", "Casual Greeting" - NEVER use "New Conversation" or "New Chat"

Examples:
User: "What are the legal requirements for starting a business in Pakistan?"
Title: Business Legal Requirements

User: "Can you explain the difference between civil and criminal law?"
Title: Civil vs Criminal Law

User: "Hello, how are you?"
Title: Friendly Hello

User: "hi"
Title: Quick Chat

User: "hey there"
Title: Casual Greeting

User: "Help me draft a contract for renting my apartment"
Title: Apartment Rental Contract`
                },
                { role: 'user', content: message }
            ],
            temperature: 0.3,
            max_tokens: 50
        });

        const title = completion.choices[0]?.message?.content?.trim() || message.slice(0, 40);

        // Clean up the title - remove quotes and limit length
        const cleanTitle = title
            .replace(/^["']|["']$/g, '') // Remove surrounding quotes
            .replace(/[.!?]$/, '') // Remove trailing punctuation
            .slice(0, 60); // Max 60 chars

        km.recordSuccess(selectedKey.id, Date.now(), completion.usage?.total_tokens || 0);

        res.json({
            success: true,
            title: cleanTitle
        });
    } catch (error) {
        console.error('Title generation error:', error.message);
        km.recordFailure(selectedKey.id, error);

        // Fallback to simple title
        const fallbackTitle = message.slice(0, 40) + (message.length > 40 ? '...' : '');
        res.json({ success: true, title: fallbackTitle });
    }
}));

/**
 * POST /api/ai/summarize
 * Proxy file upload to the Python summarization agent
 */
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const summaryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.docx', '.doc', '.txt'];
        const ext = '.' + file.originalname.split('.').pop().toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type. Allowed: ${allowed.join(', ')}`));
        }
    }
});

router.post('/summarize', authenticate, summaryUpload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'No file uploaded', 'MISSING_FILE');
    }

    const agentUrl = config.SUMMARIZATION_AGENT_URL.replace(/\/$/, '');

    try {
        // Build multipart form data to forward to Python agent
        const form = new FormData();
        form.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const response = await axios.post(`${agentUrl}/summarize`, form, {
            headers: {
                ...form.getHeaders()
            }
        });

        res.status(202).json({
            success: true,
            jobId: response.data.job_id,
            message: response.data.message,
            filename: response.data.filename,
        });
    } catch (error) {
        console.error('Summarization agent error:', error.response?.data || error.message);
        const status = error.response?.status || 502;
        const detail = error.response?.data?.detail || 'Summarization agent error';
        throw new ApiError(status, detail, 'AGENT_ERROR');
    }
}));

/**
 * GET /api/ai/summarize-status/:jobId
 * Poll the status of a summarization job
 */
router.get('/summarize-status/:jobId', authenticate, asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const agentUrl = config.SUMMARIZATION_AGENT_URL.replace(/\/$/, '');

    try {
        const response = await axios.get(`${agentUrl}/jobs/${jobId}`);
        const data = response.data;

        res.json({
            success: true,
            jobId: data.job_id,
            filename: data.filename,
            status: data.status,
            summary: data.summary || null,
            error: data.error || null,
            createdAt: data.created_at,
            completedAt: data.completed_at || null,
        });
    } catch (error) {
        console.error('Summarization status error:', error.response?.data || error.message);
        const status = error.response?.status || 502;
        const detail = error.response?.data?.detail || 'Job not found or Agent unavailable';
        throw new ApiError(status, detail, 'AGENT_ERROR');
    }
}));

/**
 * POST /api/ai/summarize-ask
 * Ask a follow-up question about a summarized document
 */
router.post('/summarize-ask', authenticate, asyncHandler(async (req, res) => {
    const { jobId, question } = req.body;

    if (!jobId || !question) {
        throw new ApiError(400, 'jobId and question are required', 'MISSING_FIELDS');
    }

    const agentUrl = config.SUMMARIZATION_AGENT_URL.replace(/\/$/, '');

    try {
        const response = await axios.post(`${agentUrl}/ask`, {
            job_id: jobId,
            question
        });

        res.json({
            success: true,
            jobId: response.data.job_id,
            question: response.data.question,
            answer: response.data.answer,
        });
    } catch (error) {
        console.error('Summarization QA error:', error.response?.data || error.message);
        const status = error.response?.status || 502;
        const detail = error.response?.data?.detail || 'QA failed';
        throw new ApiError(status, detail, 'AGENT_ERROR');
    }
}));

module.exports = router;
