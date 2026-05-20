DROP INDEX IF EXISTS ix_expenses_user_external_reference;
DROP INDEX IF EXISTS ix_expenses_user_gmail_message_id;

ALTER TABLE expenses
    DROP COLUMN IF EXISTS source_type,
    DROP COLUMN IF EXISTS external_reference,
    DROP COLUMN IF EXISTS gmail_message_id;

DROP TABLE IF EXISTS synced_emails;
DROP TABLE IF EXISTS connected_email_accounts;
