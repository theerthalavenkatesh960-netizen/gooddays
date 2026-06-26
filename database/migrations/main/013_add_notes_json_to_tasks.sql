-- Add notes_json column to tasks table
-- Used to store shopping list items and sub-items as JSON
-- Format: [{"id":"uuid","text":"Milk","done":false}, ...]

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS notes_json text;
