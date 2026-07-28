/**
 * JudicialGPT - User & Database Statistics CLI Tool
 * Usage: node scripts/check-users.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'judicial_gpt',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
});

async function main() {
    console.log('🔍 Connecting to database...');
    console.log(`📦 DB Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`🗄️  DB Name: ${process.env.DB_NAME || 'judicial_gpt'}\n`);

    try {
        // 1. Dashboard summary stats
        const statsRes = await pool.query('SELECT * FROM dashboard_stats LIMIT 1');
        const stats = statsRes.rows[0] || {};
        
        console.log('==================================================');
        console.log('📈  JUDICIAL GPT SYSTEM STATISTICS');
        console.log('==================================================');
        console.log(`👥 Total Registered Users:  ${stats.total_users || 0}`);
        console.log(`✨ New Users (Last 7 Days): ${stats.new_users_week || 0}`);
        console.log(`💬 Total Conversations:      ${stats.total_conversations || 0}`);
        console.log(`✉️  Total Messages Sent:     ${stats.total_messages || 0}`);
        console.log(`🟢 Active Users (Last 24h):  ${stats.active_users_24h || 0}`);
        console.log('==================================================\n');

        // 2. Active Sessions (currently logged in / refresh tokens)
        const sessionsRes = await pool.query(`
            SELECT s.ip_address, s.user_agent, s.created_at, s.expires_at, u.email
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.expires_at > CURRENT_TIMESTAMP
            ORDER BY s.created_at DESC
            LIMIT 10
        `);

        console.log('🔑 ACTIVE SESSIONS (Currently Logged-in/Authorized - Last 10)');
        console.log('--------------------------------------------------');
        if (sessionsRes.rows.length === 0) {
            console.log('No active/valid sessions found at this moment.');
        } else {
            sessionsRes.rows.forEach((s, idx) => {
                const expires = new Date(s.expires_at).toLocaleString();
                const created = new Date(s.created_at).toLocaleString();
                const browser = s.user_agent ? s.user_agent.substring(0, 50) + (s.user_agent.length > 50 ? '...' : '') : 'Unknown';
                console.log(`${idx + 1}. User: ${s.email}`);
                console.log(`   IP:   ${s.ip_address || 'N/A'}`);
                console.log(`   Agent: ${browser}`);
                console.log(`   Login Time:  ${created}`);
                console.log(`   Session Exp: ${expires}`);
                console.log('   ---');
            });
        }
        console.log('\n');

        // 3. User activity detailed view (using user_activity view)
        const activityRes = await pool.query(`
            SELECT email, role, status, conversation_count, message_count, last_activity
            FROM user_activity
            ORDER BY last_activity DESC NULLS LAST, conversation_count DESC
            LIMIT 20
        `);

        console.log('👤 USER REGISTRATION & ACTIVITY (Top 20 Ordered by Last Activity)');
        console.log('--------------------------------------------------');
        console.log(String('Email').padEnd(30) + ' | ' + 
                    String('Role').padEnd(8) + ' | ' + 
                    String('Status').padEnd(9) + ' | ' + 
                    String('Chats').padEnd(5) + ' | ' + 
                    String('Msgs').padEnd(5) + ' | ' + 
                    'Last Activity');
        console.log('-'.repeat(90));

        activityRes.rows.forEach(u => {
            const lastActive = u.last_activity ? new Date(u.last_activity).toLocaleString() : 'Never';
            console.log(
                String(u.email || 'N/A').substring(0, 30).padEnd(30) + ' | ' +
                String(u.role || 'user').padEnd(8) + ' | ' +
                String(u.status || 'active').padEnd(9) + ' | ' +
                String(u.conversation_count || 0).padEnd(5) + ' | ' +
                String(u.message_count || 0).padEnd(5) + ' | ' +
                lastActive
            );
        });
        console.log('==================================================');

    } catch (error) {
        console.error('❌ Error executing database stats:', error.message);
        console.log('\n💡 Tip: Please check your .env variables inside the folder to ensure DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD are correct.');
    } finally {
        await pool.end();
    }
}

main();
