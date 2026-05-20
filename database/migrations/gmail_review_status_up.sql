ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS is_reviewed boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS reviewed_at timestamp without time zone NULL;

UPDATE expenses
SET is_reviewed = false,
    reviewed_at = NULL
WHERE source_type = 'gmail'
  AND gmail_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_expenses_user_source_reviewed
    ON expenses(user_id, source_type, is_reviewed);
