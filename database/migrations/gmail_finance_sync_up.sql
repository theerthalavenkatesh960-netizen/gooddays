-- Gmail finance sync schema

CREATE TABLE IF NOT EXISTS connected_email_accounts (
    id uuid PRIMARY KEY,
    user_id integer NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    email varchar(255) NOT NULL,
    provider varchar(50) NOT NULL,
    access_token_encrypted text NOT NULL,
    refresh_token_encrypted text NOT NULL,
    token_expiry_utc timestamp without time zone NOT NULL,
    last_synced_utc timestamp without time zone NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_connected_email_accounts_user_provider
    ON connected_email_accounts(user_id, provider);

CREATE TABLE IF NOT EXISTS synced_emails (
    id uuid PRIMARY KEY,
    user_id integer NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    gmail_message_id varchar(200) NOT NULL,
    thread_id varchar(200) NULL,
    internal_date timestamp without time zone NOT NULL,
    processed_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_synced_emails_user_message
    ON synced_emails(user_id, gmail_message_id);

ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS gmail_message_id varchar(200),
    ADD COLUMN IF NOT EXISTS external_reference varchar(120),
    ADD COLUMN IF NOT EXISTS source_type varchar(50);

CREATE INDEX IF NOT EXISTS ix_expenses_user_gmail_message_id
    ON expenses(user_id, gmail_message_id);

CREATE INDEX IF NOT EXISTS ix_expenses_user_external_reference
    ON expenses(user_id, external_reference);
