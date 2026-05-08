/*
  # Add weekly_reviews table and extend daily_tracking

  1. New Tables
    - `weekly_reviews`
      - `id` (serial pk)
      - `user_id` (fk → user_profiles)
      - `week_start_date` (date, Monday of the week)
      - Stats: tasks_completed, workout_days, study_hours, mood_avg, total_spend,
               self_care_percent, habits_percent
      - User reflections: wins, improvements, next_week_focus, reflection
      - AI fields: ai_summary, ai_pattern_noticed, ai_next_focus, ai_generated

  2. Modified Tables
    - `daily_tracking`
      - Add `watercups` (integer, default 0) if not exists
      - Add `watergoalcups` (integer, default 8) if not exists
      - Add `calories` (integer, nullable) if not exists

  3. Security
    - No RLS (application-level auth via JWT, consistent with rest of schema)
*/

-- ─── weekly_reviews ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  week_start_date DATE    NOT NULL,

  -- aggregated stats
  tasks_completed   INTEGER       DEFAULT 0,
  workout_days      INTEGER       DEFAULT 0,
  study_hours       NUMERIC(5,1)  DEFAULT 0,
  self_care_percent INTEGER       DEFAULT 0,
  habits_percent    INTEGER       DEFAULT 0,
  mood_avg          NUMERIC(3,1)  DEFAULT 0,
  total_spend       NUMERIC(12,2) DEFAULT 0,

  -- user reflections
  wins              TEXT,
  improvements      TEXT,
  next_week_focus   TEXT,
  reflection        TEXT,

  -- AI-generated content
  ai_summary          TEXT,
  ai_pattern_noticed  TEXT,
  ai_next_focus       TEXT,
  ai_generated        BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, week_start_date)
);

-- ─── daily_tracking extra columns ────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_tracking' AND column_name = 'watercups'
  ) THEN
    ALTER TABLE daily_tracking ADD COLUMN watercups INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_tracking' AND column_name = 'watergoalcups'
  ) THEN
    ALTER TABLE daily_tracking ADD COLUMN watergoalcups INTEGER NOT NULL DEFAULT 8;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_tracking' AND column_name = 'calories'
  ) THEN
    ALTER TABLE daily_tracking ADD COLUMN calories INTEGER;
  END IF;
END $$;
