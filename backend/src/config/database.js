/**
 * PostgreSQL Database Configuration
 * Uses pg (node-postgres) for connection pooling
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'judicial_gpt',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
    process.exit(-1);
});

/**
 * Execute a query with parameters
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        if (process.env.NODE_ENV === 'development') {
            console.log('📊 Query executed:', { text: text.substring(0, 50), duration: `${duration}ms`, rows: result.rowCount });
        }
        return result;
    } catch (error) {
        console.error('❌ Database query error:', error.message);
        throw error;
    }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Object>} Pool client
 */
const getClient = async () => {
    const client = await pool.connect();
    const originalQuery = client.query.bind(client);
    const originalRelease = client.release.bind(client);

    // Track if client was released
    let released = false;

    // Override release to mark as released
    client.release = () => {
        if (released) {
            console.warn('⚠️ Client already released');
            return;
        }
        released = true;
        client.query = originalQuery;
        client.release = originalRelease;
        return originalRelease();
    };

    return client;
};

/**
 * Execute a transaction
 * @param {Function} callback - Function receiving client
 * @returns {Promise<any>} Transaction result
 */
const transaction = async (callback) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Check database connection
 * @returns {Promise<boolean>} Connection status
 */
const testConnection = async () => {
    try {
        const result = await query('SELECT NOW()');
        return !!result;
    } catch (error) {
        return false;
    }
};

module.exports = {
    pool,
    query,
    getClient,
    transaction,
    testConnection
};
