/**
 * Gemini (Google GenAI) helpers for the main chat.
 *
 * Messages use the same shape as the Groq path ({ role, content }); a user
 * message may also carry `images: [{ mimeType, data }]` (base64), which Gemini
 * sees directly (vision), as in the reference multimodal chatbot.
 */

const { GoogleGenAI } = require('@google/genai');
const { query } = require('../config/database');

// Gemini Flash pricing (USD per 1M tokens)
const GEMINI_PRICING = { input: 0.075, output: 0.30 };

function calcCost(usage) {
    const input = (usage.promptTokenCount || 0) / 1_000_000 * GEMINI_PRICING.input;
    const output = (usage.candidatesTokenCount || 0) / 1_000_000 * GEMINI_PRICING.output;
    return input + output;
}

function logUsage(agentName, model, usage) {
    if (!usage) return;
    const cost = calcCost(usage);
    query(
        'INSERT INTO ai_usage_logs (agent_name, model_name, prompt_tokens, completion_tokens, total_tokens, estimated_cost) VALUES ($1,$2,$3,$4,$5,$6)',
        [agentName, model || 'unknown', usage.promptTokenCount || 0, usage.candidatesTokenCount || 0, usage.totalTokenCount || 0, cost]
    ).catch(() => {}); // fire-and-forget, never block the response
}

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
const MAX_IMAGES_PER_MESSAGE = 4;

/**
 * Returns an error message if any attached image is invalid, otherwise null.
 */
function validateImages(messages) {
    for (const msg of messages) {
        if (msg.images === undefined) continue;
        if (msg.role !== 'user' || !Array.isArray(msg.images)) {
            return 'Images can only be attached to user messages';
        }
        if (msg.images.length > MAX_IMAGES_PER_MESSAGE) {
            return `At most ${MAX_IMAGES_PER_MESSAGE} images per message`;
        }
        for (const image of msg.images) {
            if (!image || !ALLOWED_IMAGE_TYPES.includes(image.mimeType) || typeof image.data !== 'string' || !image.data) {
                return 'Unsupported image. Use PNG, JPEG, WEBP, HEIC or HEIF.';
            }
        }
    }
    return null;
}

/**
 * Converts chat messages to Gemini `contents`. System messages are skipped
 * (they go in `systemInstruction`); assistant turns become role "model".
 */
function toGeminiContents(messages) {
    return messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [
                ...(m.images || []).map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
                { text: m.content }
            ]
        }));
}

function requestFor({ model, systemPrompt, messages, temperature, maxTokens }) {
    return {
        model,
        contents: toGeminiContents(messages),
        config: {
            systemInstruction: systemPrompt,
            temperature,
            maxOutputTokens: maxTokens
        }
    };
}

/** Yields the reply text chunk by chunk. Pass agentName in options to log token usage. */
async function* streamGeminiReply(apiKey, options) {
    const ai = new GoogleGenAI({ apiKey });
    const stream = await ai.models.generateContentStream(requestFor(options));
    let usageMetadata = null;
    for await (const chunk of stream) {
        if (chunk.usageMetadata) usageMetadata = chunk.usageMetadata;
        if (chunk.text) yield chunk.text;
    }
    if (options.agentName) logUsage(options.agentName, options.model, usageMetadata);
}

/** Returns { text, tokensUsed } for a complete (non-streamed) reply. Pass agentName in options to log token usage. */
async function generateGeminiReply(apiKey, options) {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent(requestFor(options));
    if (options.agentName) logUsage(options.agentName, options.model, response.usageMetadata);
    return { text: response.text || '', tokensUsed: response.usageMetadata?.totalTokenCount || 0 };
}

module.exports = { validateImages, streamGeminiReply, generateGeminiReply };
