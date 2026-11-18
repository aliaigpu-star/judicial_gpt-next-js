-- Subscription & AI Usage Tracking
-- Run: sudo -u postgres psql -d judicialgpt2 -f /var/www/judicialgpt/billing_migration.sql

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Other',
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'Monthly',
    start_date DATE,
    expiry_date DATE,
    cost DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    auto_renew BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id SERIAL PRIMARY KEY,
    agent_name VARCHAR(255) NOT NULL,
    model_name VARCHAR(255) DEFAULT 'unknown',
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10,8) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_agent ON ai_usage_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry ON subscriptions(expiry_date);
