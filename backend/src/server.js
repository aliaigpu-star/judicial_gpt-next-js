/**
 * JudicialGPT Express.js Server
 * Main application entry point
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// Load environment config
const config = require('./config/env');
const { testConnection } = require('./config/database');
const { loadBackendSecrets } = require('./vault');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');
const serviceRoutes = require('./routes/services');
const shareRoutes = require('./routes/share');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');
const rateLimiter = require('./middleware/rateLimit');

// Create Express app
const app = express();

// Trust proxy for Nginx
app.set('trust proxy', 1);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS configuration
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Check if the origin is allowed
        if (config.ALLOWED_ORIGINS.indexOf(origin) !== -1 || config.FRONTEND_URL === origin) {
            callback(null, true);
        } else {
            // detailed error for debugging
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing
app.use(cookieParser());

// Request logging (development only)
if (config.NODE_ENV === 'development') {
    app.use(requestLogger);
}

// Rate limiting
app.use(rateLimiter);

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Static files (for uploaded avatars)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/health', async (req, res) => {
    const dbConnected = await testConnection();
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'connected' : 'disconnected',
        environment: config.NODE_ENV
    });
});

// API routes and Error handlers will be mounted in startServer() after fetching secrets

// ============================================================================
// START SERVER
// ============================================================================

const startServer = async () => {
    try {
        // 1. Fetch secrets securely into memory BEFORE processing any routes
        const secrets = await loadBackendSecrets();
        
        // 2. Attach them to the Express app.locals so your routes can access them
        app.locals.secrets = secrets;

        // Inject DATABASE_URL into process.env so database.js can pick it up
        if (secrets.DATABASE_URL) {
            process.env.DATABASE_URL = secrets.DATABASE_URL;
        }

        // 3. Mount routes
        app.use('/api/auth', authRoutes);
        app.use('/api/users', userRoutes);
        app.use('/api/conversations', conversationRoutes);
        app.use('/api/messages', messageRoutes);
        app.use('/api/ai', aiRoutes);
        app.use('/api/admin', adminRoutes);
        app.use('/api/services', serviceRoutes);
        app.use('/api/share', shareRoutes);

        // 4. Mount error handlers (Must be after routes)
        app.use(notFoundHandler);
        app.use(errorHandler);

        // Example: Connecting to Postgres using the vaulted URL
        // const db = new Database(app.locals.secrets.DATABASE_URL);

        // Test database connection
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('❌ Failed to connect to database');
            process.exit(1);
        }

        // Start listening
        app.listen(config.PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════════════════╗
║                   JudicialGPT API Server                  ║
╠═══════════════════════════════════════════════════════════╣
║  Environment: ${config.NODE_ENV.padEnd(42)}║
║  Port: ${config.PORT.toString().padEnd(50)}║
║  Frontend URL: ${config.FRONTEND_URL.padEnd(41)}║
║  Database: Connected ✅                                   ║
╚═══════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server only if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
    startServer();
}

// Export for Vercel serverless
module.exports = app;
