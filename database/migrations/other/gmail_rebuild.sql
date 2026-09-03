-- Drops the Gmail sync tables so they can be recreated cleanly by re-running
-- database/migrations/main/all_up.sql, which is the single source of truth for their schema.
--
-- Everything dropped here is re-derivable by running a full Gmail sync.
-- NOTE: connected_email_accounts holds the encrypted OAuth tokens, so Gmail
--       must be reconnected through the app after this runs.
--
-- Usage:
--   1. Run this script.
--   2. Run database/migrations/main/all_up.sql.
--   3. Restart the backend, reconnect Gmail, then sync.

BEGIN;

-- expenses is never dropped: it is shared with manually entered transactions
-- and is referenced by order_transaction_links and card_expenses.
DELETE FROM expenses WHERE source_type = 'gmail';

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS order_transaction_links CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS transaction_candidates CASCADE;
DROP TABLE IF EXISTS synced_emails CASCADE;
DROP TABLE IF EXISTS card_statements CASCADE;
DROP TABLE IF EXISTS merchant_aliases CASCADE;
DROP TABLE IF EXISTS gmail_sender_stats CASCADE;
DROP TABLE IF EXISTS gmail_sync_preferences CASCADE;
DROP TABLE IF EXISTS connected_email_accounts CASCADE;

COMMIT;
