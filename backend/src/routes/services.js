/**
 * Service Proxy Routes
 * Handles OCR, transcription, and web search proxies
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const config = require('../config/env');
const ApiRequestLogger = require('../services/apiRequestLogger');

// Helper to validate file signatures (Magic Numbers)
const validateFileSignature = (buffer, mimetype) => {
    if (!buffer || buffer.length < 4) return false;
    const hex = buffer.slice(0, 4).toString('hex').toUpperCase();

    // Signatures for common types
    const signatures = {
        'application/pdf': ['25504446'],
        'image/jpeg': ['FFD8FF'],
        'image/png': ['89504E47'],
        'image/gif': ['47494638'],
        // 'image/webp' start with RIFF (52494646), then WEBP at offset 8. Simple check:
        'image/webp': ['52494646'],

        // Office
        'application/msword': ['D0CF11E0'], // OLE
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['504B0304'], // PK Zip

        // Audio
        'audio/wav': ['52494646'], // RIFF
        'audio/mpeg': ['494433', 'FFFB', 'FFF3', 'FFF2'], // ID3 or Frame Sync
        'audio/webm': ['1A45DFA3'],
        'audio/ogg': ['4F676753']
    };

    const validSigs = signatures[mimetype];
    // If we don't have a signature for this type (e.g. text/plain), skip check or enforce stricter rules securely elsewhere
    if (!validSigs) return true;

    return validSigs.some(sig => hex.startsWith(sig));
};

// Configure multer for file uploads (in memory)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

/**
 * POST /api/services/pdf-read
 * PDF text extraction proxy
 */
router.post('/pdf-read', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'No file uploaded', 'NO_FILE');
    }

    // Check file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(req.file.mimetype)) {
        throw new ApiError(400, 'Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.', 'INVALID_FILE_TYPE');
    }

    // Magic Number Check
    if (!validateFileSignature(req.file.buffer, req.file.mimetype)) {
        throw new ApiError(400, 'File content does not match extension (Spoofing detected).', 'INVALID_FILE_CONTENT');
    }

    const startTime = Date.now();
    const requestId = await ApiRequestLogger.log({
        userId: req.user?.id,
        requestType: 'pdf_read',
        endpoint: '/api/services/pdf-read',
        method: 'POST',
        status: 'pending',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
    });

    // Use external PDF reader API
    const pdfReaderUrl = config.PDF_READER_API_URL;

    try {
        const formData = new FormData();
        formData.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);

        const response = await fetch(pdfReaderUrl, {
            method: 'POST',
            body: formData
        });

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
            const errorText = await response.text();
            console.error('PDF reader API error:', response.status, errorText);

            // Update log
            if (requestId) {
                await ApiRequestLogger.update(requestId, {
                    status: 'failed',
                    responseTime,
                    statusCode: response.status,
                    errorMessage: errorText,
                    completedAt: new Date()
                });
            }

            throw new ApiError(response.status, 'PDF reading failed', 'PDF_READ_ERROR');
        }

        const text = await response.text();

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
            text: text,
            filename: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error('PDF reading error:', error.message);

        // Update log
        if (requestId) {
            await ApiRequestLogger.update(requestId, {
                status: 'failed',
                responseTime: Date.now() - startTime,
                statusCode: error.statusCode || 500,
                errorMessage: error.message,
                completedAt: new Date()
            });
        }

        if (error instanceof ApiError) throw error;
        throw new ApiError(503, 'PDF reading service unavailable', 'SERVICE_ERROR');
    }
}));

/**
 * POST /api/services/ocr
 * OCR proxy for image/PDF processing
 */
router.post('/ocr', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'No file uploaded', 'NO_FILE');
    }

    // Check file type for OCR
    const allowedOcrTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedOcrTypes.includes(req.file.mimetype)) {
        throw new ApiError(400, 'Invalid file type. Only Images, PDF, and Word documents are allowed for OCR.', 'INVALID_FILE_TYPE');
    }

    // Magic Number Check
    if (!validateFileSignature(req.file.buffer, req.file.mimetype)) {
        throw new ApiError(400, 'File content does not match extension (Spoofing detected).', 'INVALID_FILE_CONTENT');
    }

    const startTime = Date.now();
    const requestId = await ApiRequestLogger.log({
        userId: req.user?.id,
        requestType: 'ocr',
        endpoint: '/api/services/ocr',
        method: 'POST',
        model: 'tesseract', // Default or external
        status: 'pending',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
    });

    // If external OCR API is configured
    if (config.OCR_API_URL) {
        try {
            // Call the /extract-text endpoint (as expected by the OCR service)
            const ocrUrl = config.OCR_API_URL.replace(/\/$/, '') + '/extract-text';
            console.log('Calling OCR API:', ocrUrl);

            const formData = new FormData();
            formData.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);

            const response = await fetch(ocrUrl, {
                method: 'POST',
                body: formData
            });

            const responseTime = Date.now() - startTime;

            if (response.ok) {
                const data = await response.json();

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
                    text: data.text || data.content || '',
                    pages: data.pages || 1
                });
            } else {
                const errorText = await response.text();
                console.error('OCR API returned:', response.status, errorText);

                // Update log
                if (requestId) {
                    await ApiRequestLogger.update(requestId, {
                        status: 'failed',
                        responseTime,
                        statusCode: response.status,
                        errorMessage: errorText,
                        completedAt: new Date()
                    });
                }
            }
        } catch (error) {
            console.error('OCR API error:', error.message);

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

    // Fallback: Return error if no OCR service configured
    throw new ApiError(503, 'OCR service not configured', 'SERVICE_UNAVAILABLE');
}));

/**
 * POST /api/services/transcribe
 * Voice transcription proxy
 */
router.post('/transcribe', authenticate, upload.single('audio'), asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'No audio file uploaded', 'NO_FILE');
    }

    // Check file type for Transcription
    const allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/x-m4a', 'audio/ogg'];
    if (!allowedAudioTypes.includes(req.file.mimetype)) {
        throw new ApiError(400, 'Invalid file type. Only Audio files (MP3, WAV, WEBM, MP4, M4A, OGG) are allowed.', 'INVALID_FILE_TYPE');
    }

    // Magic Number Check
    if (!validateFileSignature(req.file.buffer, req.file.mimetype)) {
        throw new ApiError(400, 'File content does not match extension (Spoofing detected).', 'INVALID_FILE_CONTENT');
    }

    const startTime = Date.now();
    let requestId = await ApiRequestLogger.log({
        userId: req.user?.id,
        requestType: 'transcribe',
        endpoint: '/api/services/transcribe',
        method: 'POST',
        status: 'pending',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
    });
    let groqRequestId = null;

    // If external transcription API is configured
    if (config.TRANSCRIBE_API_URL) {
        try {
            // Call the /transcribe endpoint (as expected by the Voice service)
            const transcribeUrl = config.TRANSCRIBE_API_URL.replace(/\/$/, '') + '/transcribe';
            console.log('Calling Transcription API:', transcribeUrl);

            const formData = new FormData();
            formData.append('audio', new Blob([req.file.buffer], { type: req.file.mimetype }), 'audio.webm');

            const response = await fetch(transcribeUrl, {
                method: 'POST',
                body: formData
            });

            const responseTime = Date.now() - startTime;

            if (response.ok) {
                const data = await response.json();

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
                    text: data.text || data.transcription || ''
                });
            } else {
                const errorText = await response.text();
                console.error('Transcription API returned:', response.status, errorText);

                // Update log
                if (requestId) {
                    await ApiRequestLogger.update(requestId, {
                        status: 'failed',
                        responseTime,
                        statusCode: response.status,
                        errorMessage: errorText,
                        completedAt: new Date()
                    });
                }
            }
        } catch (error) {
            console.error('Transcription API error:', error.message);

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

    // Fallback: Use Groq Whisper if available
    if (config.GROQ_API_KEY) {
        try {
            // Create new log entry for Groq Whisper
            groqRequestId = await ApiRequestLogger.log({
                userId: req.user?.id,
                requestType: 'groq_whisper',
                endpoint: '/api/services/transcribe',
                method: 'POST',
                model: 'whisper-large-v3',
                status: 'pending',
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent']
            });

            const Groq = require('groq-sdk');
            const groq = new Groq({ apiKey: config.GROQ_API_KEY });

            const transcription = await groq.audio.transcriptions.create({
                file: new File([req.file.buffer], 'audio.webm', { type: req.file.mimetype }),
                model: 'whisper-large-v3',
                response_format: 'json'
            });

            const responseTime = Date.now() - startTime;

            // Update log
            if (groqRequestId) {
                await ApiRequestLogger.update(groqRequestId, {
                    status: 'success',
                    responseTime,
                    statusCode: 200,
                    completedAt: new Date()
                });
            }

            return res.json({
                success: true,
                text: transcription.text || ''
            });
        } catch (error) {
            console.error('Groq Whisper error:', error.message);

            // Update log
            if (groqRequestId) {
                await ApiRequestLogger.update(groqRequestId, {
                    status: 'failed',
                    responseTime: Date.now() - startTime,
                    statusCode: 500,
                    errorMessage: error.message,
                    completedAt: new Date()
                });
            }
        }
    }

    throw new ApiError(503, 'Transcription service not available', 'SERVICE_UNAVAILABLE');
}));

/**
 * POST /api/services/web-search
 * Web search proxy
 */
router.post('/web-search', authenticate, asyncHandler(async (req, res) => {
    const { query } = req.body;

    if (!query) {
        throw new ApiError(400, 'Query is required', 'MISSING_QUERY');
    }

    const startTime = Date.now();
    const requestId = await ApiRequestLogger.log({
        userId: req.user?.id,
        requestType: 'web_search',
        endpoint: '/api/services/web-search',
        method: 'POST',
        status: 'pending',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
    });

    // If external web search API is configured
    if (config.WEB_SEARCH_API_URL) {
        try {
            // Call the /ask endpoint with 'question' parameter
            const searchUrl = config.WEB_SEARCH_API_URL.replace(/\/$/, '') + '/ask';

            const response = await fetch(searchUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: query })
            });

            const responseTime = Date.now() - startTime;

            if (response.ok) {
                const data = await response.json();

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
                    results: data.sources || data.results || [],
                    answer: data.answer || data.response || ''
                });
            } else {
                const errorText = await response.text();

                // Update log
                if (requestId) {
                    await ApiRequestLogger.update(requestId, {
                        status: 'failed',
                        responseTime,
                        statusCode: response.status,
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

    throw new ApiError(503, 'Web search service not configured', 'SERVICE_UNAVAILABLE');
}));

/**
 * POST /api/services/send-email
 * Send email (for verification, notifications)
 */
router.post('/send-email', authenticate, asyncHandler(async (req, res) => {
    const { to, subject, html, text } = req.body;

    if (!to || !subject || (!html && !text)) {
        throw new ApiError(400, 'Missing required email fields', 'MISSING_FIELDS');
    }

    // Check if SMTP is configured
    if (!config.SMTP_USER || !config.SMTP_PASSWORD) {
        throw new ApiError(503, 'Email service not configured', 'SERVICE_UNAVAILABLE');
    }

    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: {
            user: config.SMTP_USER,
            pass: config.SMTP_PASSWORD
        }
    });

    try {
        await transporter.sendMail({
            from: config.EMAIL_FROM,
            to,
            subject,
            html,
            text
        });

        res.json({
            success: true,
            message: 'Email sent'
        });
    } catch (error) {
        console.error('Email send error:', error.message);
        throw new ApiError(500, 'Failed to send email', 'EMAIL_ERROR');
    }
}));

/**
 * POST /api/services/tts
 * Text-to-Speech using external TTS service or edge-tts
 */
router.post('/tts', authenticate, asyncHandler(async (req, res) => {
    const { text, voice = 'en-US-JennyNeural' } = req.body;

    if (!text || text.trim() === '') {
        throw new ApiError(400, 'Text is required', 'MISSING_TEXT');
    }

    // Limit text length
    if (text.length > 5000) {
        throw new ApiError(400, 'Text too long (max 5000 characters)', 'TEXT_TOO_LONG');
    }

    const startTime = Date.now();
    const requestId = await ApiRequestLogger.log({
        userId: req.user?.id,
        requestType: 'tts',
        endpoint: '/api/services/tts',
        method: 'POST',
        status: 'pending',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
    });

    try {
        // If external TTS API is configured
        if (config.VOICE_API_URL) {
            const ttsUrl = config.VOICE_API_URL.replace(/\/$/, '') + '/speak';
            
            const response = await fetch(ttsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice })
            });

            if (response.ok) {
                const audioBuffer = await response.arrayBuffer();
                
                const responseTime = Date.now() - startTime;
                if (requestId) {
                    await ApiRequestLogger.update(requestId, {
                        status: 'success',
                        responseTime,
                        statusCode: 200,
                        completedAt: new Date()
                    });
                }

                res.set('Content-Type', 'audio/mpeg');
                return res.send(Buffer.from(audioBuffer));
            } else {
                const errorText = await response.text();
                console.error('TTS API returned:', response.status, errorText);
            }
        }

        // Fallback: Generate audio using edge-tts via Python script
        const { spawn } = require('child_process');
        const path = require('path');
        
        // Path to the text-to-speech Python script
        const scriptPath = path.join(__dirname, '..', '..', '..', 'text_to_speech', 'text_to_speech.py');
        
        // Check if script exists, if not use inline generation
        const fs = require('fs');
        if (!fs.existsSync(scriptPath)) {
            // Return error if no TTS service available
            throw new ApiError(503, 'TTS service not configured', 'SERVICE_UNAVAILABLE');
        }

        // Generate unique temp file path
        const tempDir = require('os').tmpdir();
        const tempFile = path.join(tempDir, `tts_${Date.now()}.mp3`);

        // Call Python script to generate audio file
        await new Promise((resolve, reject) => {
            // Try python3 first (standard on Linux), fallback to python
            let pythonProcess;
            
            function setupProcessHandlers(proc) {
                let stderr = '';
                proc.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`TTS process failed: ${stderr}`));
                    }
                });
            }

            try {
                pythonProcess = spawn('python3', [scriptPath, text, voice, tempFile]);
                
                // Handle immediate spawn error (e.g. command not found)
                pythonProcess.on('error', (err) => {
                    if (err.code === 'ENOENT') {
                        // Try fallback to 'python'
                        try {
                            const fallbackProcess = spawn('python', [scriptPath, text, voice, tempFile]);
                            fallbackProcess.on('error', (fallbackErr) => {
                                reject(new Error(`Neither 'python3' nor 'python' could be found to run TTS: ${fallbackErr.message}`));
                            });
                            setupProcessHandlers(fallbackProcess);
                        } catch (fallbackCatch) {
                            reject(fallbackCatch);
                        }
                    } else {
                        reject(err);
                    }
                });
                
                setupProcessHandlers(pythonProcess);
            } catch (e) {
                reject(e);
            }
        });

        // Read the generated audio file
        const audioBuffer = fs.readFileSync(tempFile);
        
        // Clean up temp file
        try {
            fs.unlinkSync(tempFile);
        } catch (e) {
            // Ignore cleanup errors
        }

        const responseTime = Date.now() - startTime;
        if (requestId) {
            await ApiRequestLogger.update(requestId, {
                status: 'success',
                responseTime,
                statusCode: 200,
                completedAt: new Date()
            });
        }

        res.set('Content-Type', 'audio/mpeg');
        return res.send(audioBuffer);

    } catch (error) {
        console.error('TTS error:', error.message);

        if (requestId) {
            await ApiRequestLogger.update(requestId, {
                status: 'failed',
                responseTime: Date.now() - startTime,
                statusCode: error.status || 500,
                errorMessage: error.message,
                completedAt: new Date()
            });
        }

        if (error instanceof ApiError) throw error;
        throw new ApiError(503, 'TTS service unavailable', 'SERVICE_ERROR');
    }
}));

/**
 * POST /api/services/voice-to-voice
 * Complete voice-to-voice pipeline: transcribe -> AI chat -> TTS
 */
router.post('/voice-to-voice', authenticate, upload.single('audio'), asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'No audio file uploaded', 'NO_FILE');
    }

    // Check file type
    const allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/x-m4a', 'audio/ogg'];
    if (!allowedAudioTypes.includes(req.file.mimetype)) {
        throw new ApiError(400, 'Invalid file type. Only Audio files are allowed.', 'INVALID_FILE_TYPE');
    }

    const startTime = Date.now();
    const requestId = await ApiRequestLogger.log({
        userId: req.user?.id,
        requestType: 'voice_to_voice',
        endpoint: '/api/services/voice-to-voice',
        method: 'POST',
        status: 'pending',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
    });

    try {
        // Step 1: Transcribe audio
        let transcription = '';
        
        // Use Groq Whisper for transcription
        if (config.GROQ_API_KEY) {
            const Groq = require('groq-sdk');
            const groq = new Groq({ apiKey: config.GROQ_API_KEY });

            const result = await groq.audio.transcriptions.create({
                file: new File([req.file.buffer], 'audio.webm', { type: req.file.mimetype }),
                model: 'whisper-large-v3',
                response_format: 'json'
            });
            
            transcription = result.text || '';
        } else if (config.TRANSCRIBE_API_URL) {
            // Use external transcription service
            const transcribeUrl = config.TRANSCRIBE_API_URL.replace(/\/$/, '') + '/transcribe';
            const formData = new FormData();
            formData.append('audio', new Blob([req.file.buffer], { type: req.file.mimetype }), 'audio.webm');

            const response = await fetch(transcribeUrl, { method: 'POST', body: formData });
            if (response.ok) {
                const data = await response.json();
                transcription = data.text || data.transcription || '';
            }
        }

        if (!transcription) {
            throw new ApiError(400, 'Could not transcribe audio', 'TRANSCRIPTION_FAILED');
        }

        // Step 2: Send to AI model
        const messages = [
            { role: 'system', content: 'You are JudicialGPT, a helpful legal AI assistant. Provide clear, concise answers.' },
            { role: 'user', content: transcription }
        ];

        let aiResponse = '';
        
        if (config.GROQ_API_KEY) {
            const Groq = require('groq-sdk');
            const groq = new Groq({ apiKey: config.GROQ_API_KEY });

            const chatResponse = await groq.chat.completions.create({
                messages,
                model: 'mixtral-8x7b-32768',
                temperature: 0.7,
                max_tokens: 1024
            });

            aiResponse = chatResponse.choices[0]?.message?.content || '';
        } else {
            throw new ApiError(503, 'AI service not configured', 'AI_SERVICE_UNAVAILABLE');
        }

        if (!aiResponse) {
            throw new ApiError(500, 'AI response generation failed', 'AI_FAILED');
        }

        // Step 3: Generate TTS (optional - return text even if TTS fails)
        let audioBuffer = null;
        
        try {
            // Check if Python TTS script exists
            const fs = require('fs');
            const path = require('path');
            const scriptPath = path.join(__dirname, '..', '..', '..', 'text_to_speech', 'text_to_speech.py');
            
            if (fs.existsSync(scriptPath)) {
                const { spawn } = require('child_process');
                const tempDir = require('os').tmpdir();
                const tempFile = path.join(tempDir, `vtv_${Date.now()}.mp3`);

                const pythonProcess = spawn('python', [scriptPath, aiResponse, 'en-US-JennyNeural', tempFile]);
                
                await new Promise((resolve, reject) => {
                    pythonProcess.on('close', (code) => {
                        if (code === 0) resolve();
                        else reject(new Error('TTS failed'));
                    });
                });

                audioBuffer = fs.readFileSync(tempFile);
                try { fs.unlinkSync(tempFile); } catch (e) {}
            }
        } catch (ttsError) {
            console.error('TTS generation failed:', ttsError.message);
            // Continue without audio
        }

        const responseTime = Date.now() - startTime;
        
        if (requestId) {
            await ApiRequestLogger.update(requestId, {
                status: 'success',
                responseTime,
                statusCode: 200,
                completedAt: new Date()
            });
        }

        // Return response with audio if available
        if (audioBuffer) {
            res.set('Content-Type', 'application/json');
            return res.json({
                success: true,
                transcription,
                aiResponse,
                audio: audioBuffer.toString('base64'),
                audioFormat: 'mp3'
            });
        } else {
            return res.json({
                success: true,
                transcription,
                aiResponse,
                audio: null
            });
        }

    } catch (error) {
        console.error('Voice-to-voice error:', error.message);

        if (requestId) {
            await ApiRequestLogger.update(requestId, {
                status: 'failed',
                responseTime: Date.now() - startTime,
                statusCode: error.status || 500,
                errorMessage: error.message,
                completedAt: new Date()
            });
        }

        if (error instanceof ApiError) throw error;
        throw new ApiError(503, 'Voice-to-voice service unavailable', 'SERVICE_ERROR');
    }
}));

module.exports = router;
