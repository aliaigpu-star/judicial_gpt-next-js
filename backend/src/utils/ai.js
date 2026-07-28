/**
 * AI Utilities
 * Helper functions for AI related tasks
 */

/**
 * Approximate token count from string
 * @param {string} text - Text to count tokens for
 * @returns {number} Approximate token count
 */
function approximateTokens(text) {
    if (!text) return 0;
    // Simple approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
}

/**
 * Truncate message history to fit within context limits
 * @param {Array} messages - Message array
 * @param {number} maxTokens - Target maximum tokens for history (excluding system prompt & newest message)
 * @returns {Array} Truncated message array
 */
function truncateMessages(messages, maxTokens = 12000) {
    if (!messages || messages.length === 0) return [];
    if (messages.length === 1 && approximateTokens(messages[0].content) <= maxTokens) return messages;

    const systemPromptIndex = messages.findIndex(m => m.role === 'system');
    let systemPrompt = null;
    let otherMessages = [...messages];

    if (systemPromptIndex !== -1) {
        systemPrompt = messages[systemPromptIndex];
        otherMessages.splice(systemPromptIndex, 1);
    }

    // Always keep the MOST RECENT message (last one)
    const latestMessage = { ...otherMessages.pop() };
    let latestMessageTokens = approximateTokens(latestMessage.content);
    
    // Safety check: if the LATEST message itself is larger than maxTokens, we MUST truncate it
    // because Groq will reject it otherwise.
    if (latestMessageTokens > maxTokens - 1000) {
        const allowedChars = (maxTokens - 1000) * 4;
        latestMessage.content = latestMessage.content.substring(0, allowedChars) + "\n\n[... Message truncated due to length ...]";
        latestMessageTokens = approximateTokens(latestMessage.content);
    }

    let currentTokens = latestMessageTokens;
    
    if (systemPrompt) {
        currentTokens += approximateTokens(systemPrompt.content);
    }

    const resultMessages = [];
    
    // Iterate backwards to keep the most recent context
    for (let i = otherMessages.length - 1; i >= 0; i--) {
        const msg = otherMessages[i];
        const tokens = approximateTokens(msg.content);
        
        // Leave room for the response (e.g. 2000 tokens)
        if (currentTokens + tokens > maxTokens - 2000) {
            break;
        }
        
        resultMessages.unshift(msg);
        currentTokens += tokens;
    }

    // Combine: system prompt + middle history (truncated) + newest message
    const finalMessages = [];
    if (systemPrompt) finalMessages.push(systemPrompt);
    finalMessages.push(...resultMessages);
    finalMessages.push(latestMessage);

    return finalMessages;
}

module.exports = {
    approximateTokens,
    truncateMessages
};
