/**
 * Script to create proper system_settings table structure and insert SMTP settings
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/judicial_gpt'
});

async function migrate() {
    const client = await pool.connect();

    try {
        console.log('🔧 Dropping old system_settings table...');
        await client.query('DROP TABLE IF EXISTS system_settings CASCADE');

        console.log('🔧 Creating new system_settings table with proper structure...');
        await client.query(`
            CREATE TABLE system_settings (
                id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
                smtp_enabled BOOLEAN DEFAULT TRUE,
                smtp_host VARCHAR(255),
                smtp_port INTEGER DEFAULT 587,
                smtp_secure BOOLEAN DEFAULT FALSE,
                smtp_user VARCHAR(255),
                smtp_password TEXT,
                smtp_from_email VARCHAR(255),
                smtp_from_name VARCHAR(255) DEFAULT 'Judicial GPT',
                require_email_verification BOOLEAN DEFAULT FALSE,
                updated_by UUID,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('🔧 Inserting SMTP settings with your Gmail App Password...');
        await client.query(`
            INSERT INTO system_settings (
                id, 
                smtp_enabled, 
                smtp_host, 
                smtp_port, 
                smtp_secure, 
                smtp_user, 
                smtp_password, 
                smtp_from_email, 
                smtp_from_name,
                require_email_verification
            ) VALUES (
                '00000000-0000-0000-0000-000000000001',
                true,
                'smtp.gmail.com',
                587,
                false,
                'zubitech906@gmail.com',
                'nwpvekleuulqxnkn',
                'zubitech906@gmail.com',
                'Judicial GPT',
                true
            )
        `);
        console.log('✅ SMTP settings created!');

        // Verify the settings
        console.log('\n📧 SMTP Settings:');
        const settings = await client.query('SELECT * FROM system_settings');
        console.log({
            smtp_enabled: settings.rows[0].smtp_enabled,
            smtp_host: settings.rows[0].smtp_host,
            smtp_port: settings.rows[0].smtp_port,
            smtp_secure: settings.rows[0].smtp_secure,
            smtp_user: settings.rows[0].smtp_user,
            smtp_from_email: settings.rows[0].smtp_from_email,
            require_email_verification: settings.rows[0].require_email_verification
        });

        // Verify all users
        console.log('\n🔧 Verifying existing users...');
        const verifyResult = await client.query(`
            UPDATE users 
            SET email_verified = true 
            WHERE email_verified = false OR email_verified IS NULL
        `);
        console.log('✅ Users verified! Rows affected:', verifyResult.rowCount);

        console.log('\n✅ All done! Restart your backend server.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
