-- 007_up.sql
-- Advanced goals: checklist and milestone support

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS goal_type text NOT NULL DEFAULT 'checklist',
  ADD COLUMN IF NOT EXISTS target_value numeric(18,2),
  ADD COLUMN IF NOT EXISTS current_value numeric(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS deadline_date date,
  ADD COLUMN IF NOT EXISTS auto_complete boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE goal_daily_logs
  ADD COLUMN IF NOT EXISTS value_delta numeric(18,2);

ALTER TABLE flashcards
  ADD COLUMN IF NOT EXISTS topic text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS confidence_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reviewed timestamptz,
  ADD COLUMN IF NOT EXISTS next_review timestamptz;

CREATE TABLE IF NOT EXISTS goal_checklist_items (
  id            SERIAL PRIMARY KEY,
  goal_id       integer REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  title         text NOT NULL,
  is_completed  boolean NOT NULL DEFAULT false,
  position      integer NOT NULL DEFAULT 0,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goal_checklist_goal_position ON goal_checklist_items(goal_id, position);
CREATE INDEX IF NOT EXISTS idx_goal_checklist_goal_completed ON goal_checklist_items(goal_id, is_completed);
