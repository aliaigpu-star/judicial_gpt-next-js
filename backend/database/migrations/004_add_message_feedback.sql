-- Message feedback (like / dislike) for quality review and model training.
-- Migration: 004_add_message_feedback.sql
--
-- Each row is a self-contained training example: the question and answer are
-- copied at rating time, so the record survives the chat being edited or
-- deleted. One rating per user per message; re-rating updates the row.
-- The backend also creates this table automatically on startup.

CREATE TABLE IF NOT EXISTS message_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rating VARCHAR(10) NOT NULL CHECK (rating IN ('like', 'dislike')),
    reasons TEXT[] NOT NULL DEFAULT '{}',
    comment TEXT,
    prompt TEXT,
    response TEXT NOT NULL,
    message_version INTEGER,
    model VARCHAR(100),
    source VARCHAR(50) NOT NULL DEFAULT 'chat',
    review_status VARCHAR(20) NOT NULL DEFAULT 'new'
        CHECK (review_status IN ('new', 'reviewed', 'approved', 'excluded')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_feedback_rating ON message_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_message_feedback_status ON message_feedback(review_status);
CREATE INDEX IF NOT EXISTS idx_message_feedback_created ON message_feedback(created_at DESC);
