-- 007_down.sql
-- Rollback advanced goals changes

DROP INDEX IF EXISTS idx_goal_checklist_goal_completed;
DROP INDEX IF EXISTS idx_goal_checklist_goal_position;
DROP TABLE IF EXISTS goal_checklist_items;

ALTER TABLE flashcards
  DROP COLUMN IF EXISTS next_review,
  DROP COLUMN IF EXISTS last_reviewed,
  DROP COLUMN IF EXISTS confidence_level,
  DROP COLUMN IF EXISTS topic;

ALTER TABLE goal_daily_logs
  DROP COLUMN IF EXISTS value_delta;

ALTER TABLE goals
  DROP COLUMN IF EXISTS completed_at,
  DROP COLUMN IF EXISTS auto_complete,
  DROP COLUMN IF EXISTS deadline_date,
  DROP COLUMN IF EXISTS start_date,
  DROP COLUMN IF EXISTS unit,
  DROP COLUMN IF EXISTS current_value,
  DROP COLUMN IF EXISTS target_value,
  DROP COLUMN IF EXISTS goal_type;
