CREATE TABLE IF NOT EXISTS quiz_submissions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT,
    personal_email TEXT,
    designation TEXT,
    posting TEXT,
    years_experience TEXT,
    contact_no TEXT,
    score INTEGER,
    total INTEGER,
    answers JSONB,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
