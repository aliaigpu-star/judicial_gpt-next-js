const cron = require('node-cron');
const { query } = require('../config/database');
const emailService = require('./emailService');
const config = require('../config/env');

async function checkSubscriptions() {
    console.log('[Billing Cron] Checking subscription expiries...');
    try {
        const result = await query(`
            SELECT *, EXTRACT(DAY FROM (expiry_date - CURRENT_DATE))::integer as remaining_days
            FROM subscriptions
            WHERE expiry_date IS NOT NULL AND expiry_date >= CURRENT_DATE
            ORDER BY expiry_date ASC
        `);

        for (const sub of result.rows) {
            const days = sub.remaining_days;
            if (![7, 3, 1].includes(days)) continue;

            const adminEmail = config.ADMIN_EMAIL;
            if (!adminEmail) {
                console.log(`[Billing Cron] No ADMIN_EMAIL set, skipping alert for ${sub.service_name}`);
                continue;
            }

            const urgencyColor = days <= 3 ? '#dc2626' : '#d97706';
            const urgencyLabel = days === 1 ? 'URGENT' : 'WARNING';

            const result2 = await emailService.sendEmail({
                to: adminEmail,
                subject: `⚠️ [${urgencyLabel}] ${sub.service_name} expires in ${days} day${days !== 1 ? 's' : ''}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
                        <div style="background: ${urgencyColor}; padding: 20px 24px; border-radius: 8px 8px 0 0;">
                            <h2 style="color: white; margin: 0;">⚠️ Subscription Expiry Alert</h2>
                        </div>
                        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
                            <p style="font-size: 16px; color: #111827;"><strong>${sub.service_name}</strong> expires in <strong style="color:${urgencyColor}">${days} day${days !== 1 ? 's' : ''}</strong>.</p>
                            <table style="width:100%; border-collapse:collapse; margin-top:16px;">
                                <tr><td style="padding:6px 0; color:#6b7280; width:140px">Category</td><td style="padding:6px 0; font-weight:500">${sub.category}</td></tr>
                                <tr><td style="padding:6px 0; color:#6b7280">Expiry Date</td><td style="padding:6px 0; font-weight:500">${new Date(sub.expiry_date).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</td></tr>
                                <tr><td style="padding:6px 0; color:#6b7280">Cost</td><td style="padding:6px 0; font-weight:500">$${sub.cost} / ${sub.billing_cycle}</td></tr>
                                <tr><td style="padding:6px 0; color:#6b7280">Auto Renew</td><td style="padding:6px 0; font-weight:500">${sub.auto_renew ? '✅ Yes' : '❌ No'}</td></tr>
                                ${sub.notes ? `<tr><td style="padding:6px 0; color:#6b7280">Notes</td><td style="padding:6px 0">${sub.notes}</td></tr>` : ''}
                            </table>
                            <div style="margin-top:24px; text-align:center;">
                                <a href="${config.FRONTEND_URL}/admin/billing" style="display:inline-block; padding:12px 24px; background:#00a859; color:white; text-decoration:none; border-radius:8px; font-weight:600;">
                                    Manage Subscriptions →
                                </a>
                            </div>
                        </div>
                    </div>
                `
            });
            console.log(`[Billing Cron] Alert ${result2.success ? 'sent' : 'failed'} for ${sub.service_name} (${days} days remaining)`);
        }
    } catch (err) {
        console.error('[Billing Cron] Error:', err.message);
    }
}

function startSubscriptionCron() {
    // Run at 9 AM every day
    cron.schedule('0 9 * * *', checkSubscriptions, { timezone: 'Asia/Karachi' });
    console.log('✅ Subscription expiry cron started (daily 9 AM PKT)');
}

module.exports = { startSubscriptionCron, checkSubscriptions };
