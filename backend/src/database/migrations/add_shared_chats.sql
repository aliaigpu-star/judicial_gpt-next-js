-- Add shared_chats table for secure chat sharing
CREATE TABLE IF NOT EXISTS shared_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    share_token VARCHAR(64) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    view_count INTEGER DEFAULT 0
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_shared_chats_token ON shared_chats(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_chats_conversation ON shared_chats(conversation_id);
