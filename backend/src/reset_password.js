require('dotenv').config();
const { query } = require('./config/database');
const bcrypt = require('bcryptjs');

async function resetPassword() {
    try {
        const email = 'admin@gmail.com';
        const newPassword = 'password123';
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        console.log(`🔄 Resetting password for ${email} to '${newPassword}'...`);

        const result = await query(
            'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id',
            [hashedPassword, email]
        );

        if (result.rowCount > 0) {
            console.log(`✅ Password reset successfully for user ID: ${result.rows[0].id}`);
        } else {
            console.log(`⚠️ User not found: ${email}`);
            // Try resetting test@example.com
            const email2 = 'test@example.com';
            console.log(`🔄 Trying ${email2}...`);
            const result2 = await query(
                'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id',
                [hashedPassword, email2]
            );
            if (result2.rowCount > 0) {
                console.log(`✅ Password reset successfully for user ID: ${result2.rows[0].id}`);
            } else {
                console.log(`⚠️ User not found: ${email2}`);
            }
        }

    } catch (error) {
        console.error('❌ Error resetting password:', error);
    } finally {
        process.exit();
    }
}

resetPassword();
