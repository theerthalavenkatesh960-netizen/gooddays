-- 005_up.sql
-- Adds daily meal logs table for Body > Diet meal completion tracking

CREATE TABLE IF NOT EXISTS daily_meal_logs (
  id            SERIAL PRIMARY KEY,
  user_id       integer NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date          date NOT NULL,
  meal_ids_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_meal_logs_user_date ON daily_meal_logs(user_id, date);