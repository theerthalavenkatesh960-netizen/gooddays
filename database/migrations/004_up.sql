-- ─── Water Tracking & Quick Log System ────────────────────────────────────
-- Migration 004: Water intake tracking (ml-based) and unified quick log system

-- 1. Daily water logs: Track daily water intake in milliliters
CREATE TABLE IF NOT EXISTS daily_water_logs (
  id          SERIAL PRIMARY KEY,
  user_id     integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date        date NOT NULL,
  ml_consumed integer NOT NULL DEFAULT 0,
  goal_ml     integer NOT NULL DEFAULT 2000,
  unit        text NOT NULL DEFAULT 'ml' CHECK (unit IN ('ml', 'l')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_daily_water_logs_user_date ON daily_water_logs(user_id, date);

-- 2. Quick log entries: Unified logging for workout, meal, expense, water, and task entries
-- The payload_json field stores type-specific data:
--   - workout: { exerciseId, reps?, weightKg?, notes? }
--   - meal: { mealIds: [] }
--   - expense: { amount, category, note? }
--   - water: { ml }
--   - task: { title, category?, priority?, description? }
CREATE TABLE IF NOT EXISTS quick_log_entries (
  id            SERIAL PRIMARY KEY,
  user_id       integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date          date NOT NULL,
  type          text NOT NULL CHECK (type IN ('workout', 'meal', 'expense', 'water', 'task')),
  payload_json  jsonb NOT NULL,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quick_log_user_date ON quick_log_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_quick_log_user_type ON quick_log_entries(user_id, type);
CREATE INDEX IF NOT EXISTS idx_quick_log_created ON quick_log_entries(created_at);
