-- Add text question support to quiz_questions
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(10) NOT NULL DEFAULT 'mcq';
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS expected_answer TEXT;

-- Allow NULL for option columns (text questions don't have options)
ALTER TABLE quiz_questions ALTER COLUMN option_a DROP NOT NULL;
ALTER TABLE quiz_questions ALTER COLUMN option_b DROP NOT NULL;
ALTER TABLE quiz_questions ALTER COLUMN option_c DROP NOT NULL;
ALTER TABLE quiz_questions ALTER COLUMN option_d DROP NOT NULL;
ALTER TABLE quiz_questions ALTER COLUMN correct_option DROP NOT NULL;

-- Add batch and ai_feedback to quiz_submissions
ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS batch TEXT;
ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS ai_feedback JSONB;
