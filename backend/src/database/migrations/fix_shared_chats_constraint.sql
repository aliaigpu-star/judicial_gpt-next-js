-- Add UNIQUE constraint on conversation_id for ON CONFLICT to work
ALTER TABLE shared_chats ADD CONSTRAINT shared_chats_conversation_id_unique UNIQUE (conversation_id);
