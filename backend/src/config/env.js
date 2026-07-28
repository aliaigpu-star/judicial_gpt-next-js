/**
 * Environment Configuration
 * Centralized environment variable management
 */

require('dotenv').config();

const config = {
    // Server
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT) || 3001,
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',

    // Frontend URL (for CORS)
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],

    // Database
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT) || 5432,
    DB_NAME: process.env.DB_NAME || 'judicialgpt2',
    DB_USER: process.env.DB_USER || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || '',

    // JWT
    JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

    // Groq API
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',

    
    // Email (Nodemailer)
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
    EMAIL_FROM: process.env.EMAIL_FROM || 'JudicialGPT <noreply@judicialgpt.org>',

    // Google OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',

    // External Services
    PDF_READER_API_URL: process.env.PDF_READER_API_URL || 'https://judgegpt-file-read-222957019725.europe-west1.run.app',
    OCR_API_URL: process.env.OCR_API_URL || '',
    TRANSCRIBE_API_URL: process.env.TRANSCRIBE_API_URL || '',
    WEB_SEARCH_API_URL: process.env.WEB_SEARCH_API_URL || '',
    VOICE_API_URL: process.env.VOICE_API_URL || '',
    JUDGMENT_SEARCH_AGENT_URL: process.env.JUDGMENT_SEARCH_AGENT_URL || 'https://judgementsearch-judicial-gpt.in.ngrok.io',
    SUMMARIZATION_AGENT_URL: process.env.SUMMARIZATION_AGENT_URL || 'https://summarizationagent-judicial-gpt.in.ngrok.io',
    CIVIL_JUDGEMENT_AGENT_URL: process.env.CIVIL_JUDGEMENT_AGENT_URL || 'https://civiljudgement-judicial-gpt.in.ngrok.io',
    CRIMINAL_JUDGEMENT_AGENT_URL: process.env.CRIMINAL_JUDGEMENT_AGENT_URL || 'https://criminaljudgement-judicial-gpt.in.ngrok.io',
    CIVIL_LAW_AGENT_URL: process.env.CIVIL_LAW_AGENT_URL || 'https://civillaw-judicial-gpt.in.ngrok.io',
    CRIMINAL_LAW_AGENT_URL: process.env.CRIMINAL_LAW_AGENT_URL || 'https://criminallaw-judicial-gpt.in.ngrok.io',

    // Cloudflare Turnstile (CAPTCHA)
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || '',

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

    // Session
    SESSION_SECRET: process.env.SESSION_SECRET || 'session-secret-change-in-production',

    // File Upload
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
};

// Validate required variables in production
if (config.NODE_ENV === 'production') {
    const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_PASSWORD', 'SESSION_SECRET'];
    const missing = required.filter(key => !config[key]);

    if (missing.length > 0) {
        console.warn(`⚠️ Warning: Missing environment variables: ${missing.join(', ')}. Using defaults.`);
    }
}

module.exports = config;
