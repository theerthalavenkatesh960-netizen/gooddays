DROP INDEX IF EXISTS ix_expenses_user_source_reviewed;

ALTER TABLE expenses
    DROP COLUMN IF EXISTS reviewed_at,
    DROP COLUMN IF EXISTS is_reviewed;
