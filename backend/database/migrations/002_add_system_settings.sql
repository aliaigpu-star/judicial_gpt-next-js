-- Add system_settings table for SMTP and other system configurations

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
    -- SMTP Settings
    smtp_enabled BOOLEAN DEFAULT TRUE,
    smtp_host VARCHAR(255),
    smtp_port INTEGER DEFAULT 587,
    smtp_secure BOOLEAN DEFAULT FALSE,
    smtp_user VARCHAR(255),
    smtp_password TEXT,
    smtp_from_email VARCHAR(255),
    smtp_from_name VARCHAR(255) DEFAULT 'Judicial GPT',
    -- Email Verification
    require_email_verification BOOLEAN DEFAULT FALSE,
    -- Other settings can be added here
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings if not exists
INSERT INTO system_settings (id, smtp_enabled, require_email_verification, smtp_host, smtp_port, smtp_secure, smtp_from_name)
VALUES ('00000000-0000-0000-0000-000000000001', TRUE, FALSE, 'smtp.gmail.com', 587, TRUE, 'Judicial GPT')
ON CONFLICT (id) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
