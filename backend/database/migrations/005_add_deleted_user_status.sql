-- Soft-deleted accounts: a user who deletes their account is set to status
-- 'deleted'. They can no longer log in, but all their data is kept and an
-- admin can restore the account by setting the status back to 'active'.
-- Migration: 005_add_deleted_user_status.sql
-- The backend also applies this automatically on startup.
--
-- Safe to run more than once. It only widens the list of allowed status
-- values; no rows, columns or tables are removed or changed. The whole block
-- is one atomic step: if anything fails, nothing is changed.

DO $$
DECLARE
    existing record;
BEGIN
    -- Already allows 'deleted': nothing to do (keeps server restarts from touching the table).
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'user_profiles'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%deleted%'
    ) THEN
        RETURN;
    END IF;

    -- Replace the old status check (whatever it is named) with one that also allows 'deleted'.
    FOR existing IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'user_profiles'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE user_profiles DROP CONSTRAINT %I', existing.conname);
    END LOOP;

    ALTER TABLE user_profiles
        ADD CONSTRAINT user_profiles_status_check
        CHECK (status IN ('active', 'inactive', 'suspended', 'banned', 'deleted'));
END $$;
