/**
 * Email Service for sending emails via SMTP
 * Supports email verification, password reset, and general notifications
 */

const nodemailer = require('nodemailer');
const db = require('../config/database');

class EmailService {
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
        this.settings = null;
    }

    /**
     * Load SMTP settings from database
     */
    async loadSettings() {
        try {
            const result = await db.query(
                'SELECT smtp_enabled, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, smtp_from_email, smtp_from_name FROM system_settings WHERE id = $1',
                ['00000000-0000-0000-0000-000000000001']
            );

            if (result.rows.length > 0) {
                this.settings = result.rows[0];
                return this.settings;
            } else {
                console.warn('⚠️ System settings not found in database. Please run the migration: 002_add_system_settings.sql');
                return null;
            }
        } catch (error) {
            console.error('❌ Error loading SMTP settings:', error.message);
            if (error.code === '42P01') {
                console.error('   Database table "system_settings" does not exist. Please run the migration.');
            }
            return null;
        }
    }

    /**
     * Initialize the email transporter with SMTP configuration from database
     */
    async initialize(force = false) {
        // Force reinitialize if settings changed
        if (force) {
            this.isConfigured = false;
            this.transporter = null;
            this.settings = null;
        }

        if (this.isConfigured && this.transporter && !force) {
            console.log('📧 Email service already initialized, skipping...');
            return;
        }

        console.log('📧 Loading SMTP settings from database...');
        // Load settings from database
        const settings = await this.loadSettings();

        if (!settings || !settings.smtp_enabled) {
            console.log('⚠️ SMTP is disabled or not configured');
            console.log(`   Settings found: ${settings ? 'Yes' : 'No'}`);
            console.log(`   SMTP Enabled: ${settings?.smtp_enabled || false}`);
            this.isConfigured = false;
            this.transporter = null;
            return;
        }

        console.log('📧 SMTP settings loaded:');
        console.log(`   Host: ${settings.smtp_host || 'Not set'}`);
        console.log(`   Port: ${settings.smtp_port || 'Not set'}`);
        console.log(`   Secure: ${settings.smtp_secure || false}`);
        console.log(`   User: ${settings.smtp_user ? settings.smtp_user.substring(0, 3) + '***' : 'Not set'}`);
        console.log(`   Password: ${settings.smtp_password ? '***' : 'Not set'}`);
        console.log(`   From Email: ${settings.smtp_from_email || 'Not set'}`);
        console.log(`   From Name: ${settings.smtp_from_name || 'Not set'}`);

        const port = parseInt(settings.smtp_port || '587');

        // Auto-determine secure setting based on port if not explicitly set correctly
        // Port 465 = Direct SSL/TLS (secure: true)
        // Port 587 = STARTTLS (secure: false, but still encrypted via STARTTLS)
        // Port 25 = Plain (no encryption, not recommended)
        let secure = settings.smtp_secure === true || settings.smtp_secure === 'true';

        // Fix common misconfiguration: Port 587 with secure=true causes SSL errors
        if (port === 587 && secure) {
            console.log('⚠️ Detected Port 587 with Secure=true. Auto-correcting to Secure=false (STARTTLS).');
            secure = false;
        }
        // Port 465 should always use secure=true
        if (port === 465 && !secure) {
            console.log('⚠️ Detected Port 465 with Secure=false. Auto-correcting to Secure=true (SSL).');
            secure = true;
        }

        const config = {
            host: settings.smtp_host || 'smtp.gmail.com',
            port: port,
            secure: secure, // true for 465, false for 587 (STARTTLS)
            auth: {
                user: settings.smtp_user,
                pass: settings.smtp_password,
            },
            // Increased timeouts for slow networks
            connectionTimeout: 30000, // 30 seconds
            greetingTimeout: 30000,
            socketTimeout: 30000,
        };

        // For port 587, we want to require TLS upgrade via STARTTLS
        if (port === 587) {
            config.requireTLS = true;
            config.tls = {
                // Do not fail on invalid certs (useful for development)
                rejectUnauthorized: false,
                minVersion: 'TLSv1.2'
            };
        }

        // For port 465, add TLS options
        if (port === 465) {
            config.tls = {
                rejectUnauthorized: false
            };
        }

        console.log(`📧 Final SMTP Config: Host=${config.host}, Port=${config.port}, Secure=${config.secure}, RequireTLS=${config.requireTLS || false}`);

        // Validate configuration
        if (!config.auth.user || !config.auth.pass) {
            console.warn('⚠️ SMTP credentials not configured. Email sending will be disabled.');
            console.warn(`   User: ${config.auth.user ? 'Set' : 'Missing'}`);
            console.warn(`   Password: ${config.auth.pass ? 'Set' : 'Missing'}`);
            this.isConfigured = false;
            this.transporter = null;
            return;
        }

        try {
            console.log('📧 Creating email transporter...');
            this.transporter = nodemailer.createTransport(config);

            // Mark as configured immediately - don't block on verification
            this.isConfigured = true;
            this.settings = settings;
            console.log('✅ Email transporter created successfully');
            console.log(`   Host: ${config.host}:${config.port}`);
            console.log(`   User: ${config.auth.user}`);
            console.log(`   Secure: ${config.secure}`);

            // Try to verify in background (non-blocking)
            console.log('📧 Verifying SMTP connection (non-blocking)...');
            this.transporter.verify()
                .then(() => {
                    console.log('✅ SMTP connection verified successfully');
                })
                .catch((verifyError) => {
                    console.warn('⚠️ SMTP verification failed (will still try to send emails):');
                    console.warn(`   Error: ${verifyError.message}`);
                    // Don't set isConfigured to false - we'll try sending anyway
                    // Some networks block verification but allow actual sending
                });

        } catch (error) {
            console.error('❌ Failed to create email transporter:');
            console.error(`   Error: ${error.message}`);
            console.error(`   Code: ${error.code || 'N/A'}`);

            // Provide helpful error messages
            if (error.code === 'EAUTH') {
                console.error('   ❌ Authentication failed. Check your SMTP username and password.');
                console.error('   💡 For Gmail, make sure you\'re using an App Password, not your regular password.');
                console.error('   💡 Steps: Google Account → Security → 2-Step Verification → App Passwords');
            } else if (error.code === 'ECONNECTION' || error.code === 'ESOCKET') {
                console.error('   ❌ Connection failed. Possible issues:');
                console.error(`      - Check SMTP host: ${config.host}`);
                console.error(`      - Check SMTP port: ${config.port}`);
                console.error('      - Check firewall/network settings');
                console.error('      - For Gmail, ensure "Less secure app access" is enabled OR use App Password');
                console.error('      - Try port 465 with Secure=true, or port 587 with Secure=false');
            } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                console.error('   ❌ Connection timeout. Check your network or firewall settings.');
            } else {
                console.error(`   Full error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
            }

            this.transporter = null;
            this.isConfigured = false;

            // Create a more user-friendly error message
            let userMessage = error.message;
            if (error.code === 'ESOCKET' || error.code === 'ECONNECTION') {
                userMessage = `Cannot connect to SMTP server. Please check your SMTP host (${config.host}), port (${config.port}), and network settings.`;
            } else if (error.code === 'EAUTH') {
                userMessage = 'SMTP authentication failed. Please check your username and password. For Gmail, use an App Password.';
            }

            // Store error for later reference but don't throw
            this.lastError = { message: userMessage, code: error.code };
        }
    }

    /**
     * Check if SMTP is enabled and configured
     */
    async isEnabled() {
        const settings = await this.loadSettings();
        return settings && settings.smtp_enabled && settings.smtp_user && settings.smtp_password;
    }

    /**
     * Send an email
     * @param {Object} options - Email options
     * @param {string} options.to - Recipient email address
     * @param {string} options.subject - Email subject
     * @param {string} options.html - Email HTML content
     * @param {string} options.text - Email plain text content (optional)
     * @returns {Promise<Object>} - Result with success status
     */
    async sendEmail({ to, subject, html, text }) {
        // Check if SMTP is enabled
        if (!(await this.isEnabled())) {
            console.log('⚠️ SMTP is disabled. Email not sent.');
            return { success: false, error: 'SMTP is disabled' };
        }

        // Try to initialize, but don't fail if it doesn't work
        try {
            await this.initialize(true);
        } catch (error) {
            console.error('⚠️ Email service initialization failed during send:', error.message);
            // Continue anyway - might still work
        }

        if (!this.transporter) {
            const errorMsg = this.lastError?.message || 'Email service not configured';
            console.error('❌ Email service not configured. Cannot send email.');
            console.error('   Please check your SMTP settings in the admin panel.');
            return { success: false, error: errorMsg };
        }

        try {
            const settings = this.settings || await this.loadSettings();
            const fromEmail = settings?.smtp_from_email || settings?.smtp_user;
            const fromName = settings?.smtp_from_name || 'Judicial GPT';

            if (!fromEmail) {
                console.error('❌ From email address is not configured');
                return { success: false, error: 'From email address is not configured' };
            }

            console.log(`📧 Preparing email to send:`);
            console.log(`   From: ${fromName} <${fromEmail}>`);
            console.log(`   To: ${to}`);
            console.log(`   Subject: ${subject}`);

            const mailOptions = {
                from: `${fromName} <${fromEmail}>`,
                to,
                subject,
                html,
                text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
            };

            console.log('📧 Sending email via SMTP...');
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email sent successfully!');
            console.log(`   Message ID: ${info.messageId}`);
            console.log(`   Response: ${info.response || 'N/A'}`);
            return { success: true, messageId: info.messageId, response: info.response };
        } catch (error) {
            console.error('❌ Error sending email:');
            console.error(`   Error Type: ${error.constructor.name}`);
            console.error(`   Error Message: ${error.message}`);
            console.error(`   Error Code: ${error.code || 'N/A'}`);
            console.error(`   Error Command: ${error.command || 'N/A'}`);

            // Check if it's a connection error after sending
            if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                console.log('⚠️ Connection error after email send - email may have been sent');
                return { success: true, warning: 'Email likely sent despite connection error' };
            }

            // Gmail sometimes returns success even with connection errors
            if (error.responseCode >= 200 && error.responseCode < 300) {
                console.log('⚠️ Response code indicates success despite error object');
                return { success: true, warning: 'Email likely sent (check response code)' };
            }

            return { success: false, error: error.message, code: error.code };
        }
    }

    /**
     * Send verification email
     * @param {string} email - User's email address
     * @param {string} name - User's name
     * @param {string} verificationToken - Verification token
     * @param {string} baseUrl - Base URL of the application
     * @returns {Promise<Object>} - Result with success status
     */
    async sendVerificationEmail(email, name, verificationToken, baseUrl) {
        const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verify Your Email</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 40px 40px 30px; text-align: center;">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                                            ⚖️ Judicial GPT
                                        </h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 40px;">
                                        <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">
                                            Welcome, ${name || 'User'}! 👋
                                        </h2>
                                        <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                            Thank you for signing up for Judicial GPT. We're excited to have you on board!
                                        </p>
                                        <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                            To complete your registration and access all features, please verify your email address by clicking the button below:
                                        </p>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="padding: 10px 0 30px;">
                                                    <a href="${verificationUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                                                        Verify Email Address
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                        <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                            Or copy and paste this link into your browser:
                                        </p>
                                        <p style="margin: 0 0 30px; padding: 15px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; color: #2563eb; font-size: 13px; word-break: break-all;">
                                            ${verificationUrl}
                                        </p>
                                        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                                            <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                                <strong>⏰ This link will expire in 24 hours.</strong>
                                            </p>
                                            <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                                                If you didn't create an account with Judicial GPT, please ignore this email.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                                        <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                                            Need help? Contact us at <a href="mailto:support@judicialgpt.com" style="color: #2563eb; text-decoration: none;">support@judicialgpt.com</a>
                                        </p>
                                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                            © ${new Date().getFullYear()} Judicial GPT. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        const text = `
            Welcome to Judicial GPT, ${name || 'User'}!
            
            Thank you for signing up. To complete your registration, please verify your email address by visiting this link:
            
            ${verificationUrl}
            
            This link will expire in 24 hours.
            
            If you didn't create an account with Judicial GPT, please ignore this email.
            
            Need help? Contact us at support@judicialgpt.com
        `;

        return await this.sendEmail({
            to: email,
            subject: '🔐 Verify Your Email Address - Judicial GPT',
            html,
            text,
        });
    }

    /**
     * Send password reset email
     * @param {string} email - User's email address
     * @param {string} name - User's name
     * @param {string} resetToken - Password reset token
     * @param {string} baseUrl - Base URL of the application
     * @returns {Promise<Object>} - Result with success status
     */
    async sendPasswordResetEmail(email, name, resetToken, baseUrl) {
        const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Your Password</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); padding: 40px 40px 30px; text-align: center;">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                                            🔒 Password Reset
                                        </h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 40px;">
                                        <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">
                                            Reset Your Password
                                        </h2>
                                        <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                            Hello ${name || 'User'},
                                        </p>
                                        <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                            We received a request to reset your password. Click the button below to create a new password:
                                        </p>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="padding: 10px 0 30px;">
                                                    <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
                                                        Reset Password
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                        <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                            Or copy and paste this link into your browser:
                                        </p>
                                        <p style="margin: 0 0 30px; padding: 15px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; color: #dc2626; font-size: 13px; word-break: break-all;">
                                            ${resetUrl}
                                        </p>
                                        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                                            <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                                <strong>⏰ This link will expire in 1 hour.</strong>
                                            </p>
                                            <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                                                If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                                        <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                                            Need help? Contact us at <a href="mailto:support@judicialgpt.com" style="color: #dc2626; text-decoration: none;">support@judicialgpt.com</a>
                                        </p>
                                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                            © ${new Date().getFullYear()} Judicial GPT. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        const text = `
            Reset Your Password - Judicial GPT
            
            Hello ${name || 'User'},
            
            We received a request to reset your password. Visit this link to create a new password:
            
            ${resetUrl}
            
            This link will expire in 1 hour.
            
            If you didn't request a password reset, please ignore this email or contact support if you have concerns.
            
            Need help? Contact us at support@judicialgpt.com
        `;

        return await this.sendEmail({
            to: email,
            subject: '🔒 Reset Your Password - Judicial GPT',
            html,
            text,
        });
    }
}

// Export singleton instance
const emailService = new EmailService();
module.exports = emailService;
