/**
 * Verify SMTP settings
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/judicial_gpt'
});

async function verify() {
    const client = await pool.connect();
    try {
        const settings = await client.query(`
            SELECT smtp_enabled, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_from_email, require_email_verification
            FROM system_settings 
            WHERE id = '00000000-0000-0000-0000-000000000001'
        `);

        if (settings.rowCount > 0) {
            console.log('✅ SMTP Settings found:');
            console.log(settings.rows[0]);
        } else {
            console.log('❌ No settings row found');
        }

        // Also show users
        const users = await client.query('SELECT id, email, email_verified FROM users LIMIT 5');
        console.log('\n👤 Users:');
        users.rows.forEach(u => console.log(`  ${u.email}: verified=${u.email_verified}`));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

verify();
