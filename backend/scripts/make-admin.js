/**
 * Make a user an admin
 * Usage: node scripts/make-admin.js <email>
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'judicial_gpt',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
});

async function makeAdmin(email) {
    if (!email) {
        console.log('Usage: node scripts/make-admin.js <email>');
        console.log('Example: node scripts/make-admin.js admin@example.com');
        process.exit(1);
    }

    try {
        // Check if user exists
        const userResult = await pool.query(
            'SELECT id, email FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (userResult.rows.length === 0) {
            console.log(`❌ User with email "${email}" not found.`);
            console.log('Make sure the user has registered first.');
            process.exit(1);
        }

        const userId = userResult.rows[0].id;

        // Update role to admin
        await pool.query(
            "UPDATE user_profiles SET role = 'admin' WHERE id = $1",
            [userId]
        );

        console.log(`✅ Successfully made "${email}" an admin!`);
        console.log(`\nYou can now access the admin panel at: http://localhost:3000/admin`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

const email = process.argv[2];
makeAdmin(email);
