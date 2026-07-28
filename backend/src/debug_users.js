require('dotenv').config();
const { query } = require('./config/database');
const bcrypt = require('bcryptjs');
const fs = require('fs');

async function debugUsers() {
    try {
        const log = (msg) => {
            console.log(msg);
            fs.appendFileSync('users_dump.txt', msg + '\n');
        };

        log('🔍 Debugging Users...');

        // Count users
        const countRes = await query('SELECT COUNT(*) FROM users');
        const count = countRes.rows[0].count;
        log(`📊 Total Users: ${count}`);

        if (count == 0) {
            log('⚠️ No users found in the database!');
            return;
        }

        // List Users
        const usersRes = await query(`
            SELECT u.id, u.email, u.email_verified, u.password_hash, 
                   up.name, up.role, up.status 
            FROM users u 
            LEFT JOIN user_profiles up ON u.id = up.id
        `);

        log('\n📋 User List:');
        for (const user of usersRes.rows) {
            log(`\n\n--- User: ${user.email} ---`);
            log(`ID: ${user.id}`);
            log(`Name: ${user.name}`);
            log(`Role: ${user.role}`);
            log(`Status: ${user.status}`);
            log(`Verified: ${user.email_verified}`);
            log(`Password Hash Present: ${!!user.password_hash}`);

            // Check a test password 'password123'
            if (user.password_hash) {
                const isMatch = await bcrypt.compare('password123', user.password_hash);
                log(`🔑 Matches 'password123': ${isMatch}`);
            }
        }

    } catch (error) {
        console.error('❌ Error debugging users:', error);
        fs.appendFileSync('users_dump.txt', `❌ Error: ${error}\n`);
    } finally {
        // Exit
        process.exit();
    }
}

debugUsers();
