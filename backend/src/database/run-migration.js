/**
 * Run migration to add shared_chats table
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'judicial_gpt'
});

async function runMigration(filename) {
    const client = await pool.connect();
    try {
        const sql = fs.readFileSync(
            path.join(__dirname, 'migrations', filename),
            'utf8'
        );
        await client.query(sql);
        console.log(`✅ Migration completed: ${filename}`);
    } catch (error) {
        console.error(`❌ Migration failed (${filename}):`, error.message);
    } finally {
        client.release();
    }
}

async function runAllMigrations() {
    // Run the constraint fix
    await runMigration('fix_shared_chats_constraint.sql');
    await pool.end();
}

runAllMigrations();
