-- Add shared_chats table for sharing conversations
-- Migration: 003_add_shared_chats.sql

CREATE TABLE IF NOT EXISTS shared_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    share_token VARCHAR(255) UNIQUE NOT NULL,
    view_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(conversation_id)
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_shared_chats_token ON shared_chats(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_chats_conversation ON shared_chats(conversation_id);

-- Trigger for updated_at
CREATE TRIGGER update_shared_chats_updated_at
    BEFORE UPDATE ON shared_chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
