const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/judicial_gpt'
});

async function fix() {
    const client = await pool.connect();
    try {
        // Add email_verified column if it doesn't exist
        console.log('Adding email_verified column...');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT true');
        console.log('✅ Column added!');

        // Also add verification_token column
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255)');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP');
        console.log('✅ Verification columns added!');

        // Set all users as verified
        const result = await client.query('UPDATE users SET email_verified = true');
        console.log('✅ Users verified:', result.rowCount);

        // Show users
        const users = await client.query('SELECT email, email_verified FROM users');
        console.log('\n👤 Users:');
        users.rows.forEach(u => console.log(`  ${u.email}: verified=${u.email_verified}`));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fix();
