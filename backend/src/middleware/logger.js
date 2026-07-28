/**
 * Request Logger Middleware
 * Logs incoming requests for debugging
 */

const requestLogger = (req, res, next) => {
    const start = Date.now();

    // Log request
    console.log(`→ ${req.method} ${req.originalUrl}`);

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusIcon = res.statusCode >= 400 ? '❌' : '✅';
        console.log(`${statusIcon} ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });

    next();
};

module.exports = { requestLogger };
