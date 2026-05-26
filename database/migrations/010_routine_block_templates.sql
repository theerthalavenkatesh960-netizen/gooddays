-- ===================================================================
-- 010: ROUTINE BLOCK TEMPLATES
-- Adds a reusable template library for routine blocks.
-- When blocks are added the backend auto-upserts a template keyed on
-- (user_id, title). Stats are derived by joining routine_blocks
-- (via template_id) -> daily_routine_logs.
-- ===================================================================

-- 1. New table
CREATE TABLE IF NOT EXISTS routine_block_templates (
  id                  SERIAL PRIMARY KEY,
  user_id             integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title               text NOT NULL,
  category            text,
  color               text,
  default_start_time  text,
  default_end_time    text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE(user_id, title)
);

CREATE INDEX IF NOT EXISTS idx_routine_block_templates_user ON routine_block_templates(user_id);

-- 2. Add nullable FK on routine_blocks
ALTER TABLE routine_blocks
  ADD COLUMN IF NOT EXISTS template_id integer REFERENCES routine_block_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_routine_blocks_template ON routine_blocks(template_id);

-- ===================================================================
-- BACKFILL: create templates from existing blocks and link them
-- ===================================================================

-- Step 1: insert one template per (user_id, title), using values from
--         the oldest block in each group
INSERT INTO routine_block_templates (user_id, title, category, color, default_start_time, default_end_time)
SELECT
  dr.user_id,
  rb.title,
  rb.category,
  rb.color,
  rb.start_time,
  rb.end_time
FROM (
  SELECT DISTINCT ON (dr2.user_id, rb2.title)
    rb2.routine_id,
    rb2.title,
    rb2.category,
    rb2.color,
    rb2.start_time,
    rb2.end_time
  FROM routine_blocks rb2
  JOIN daily_routines dr2 ON dr2.id = rb2.routine_id
  ORDER BY dr2.user_id, rb2.title, rb2.id
) rb
JOIN daily_routines dr ON dr.id = rb.routine_id
ON CONFLICT (user_id, title) DO NOTHING;

-- Step 2: back-fill template_id on all routine_blocks
UPDATE routine_blocks rb
SET template_id = t.id
FROM routine_block_templates t
JOIN daily_routines dr ON dr.user_id = t.user_id
WHERE rb.routine_id = dr.id
  AND rb.title = t.title
  AND rb.template_id IS NULL;
