-- ─── Daily Routine System ────────────────────────────────────────────────────
-- Migration 003: Daily routines, time blocks, weekly schedule, per-day logs

-- 1. Routine templates (named routines a user can create)
CREATE TABLE IF NOT EXISTS daily_routines (
  id          SERIAL PRIMARY KEY,
  user_id     integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  description text,
  color       text DEFAULT '#6C63FF',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_daily_routines_user ON daily_routines(user_id);

-- 2. Time blocks belonging to a routine
CREATE TABLE IF NOT EXISTS routine_blocks (
  id          SERIAL PRIMARY KEY,
  routine_id  integer REFERENCES daily_routines(id) ON DELETE CASCADE NOT NULL,
  title       text NOT NULL,
  start_time  text NOT NULL,   -- "HH:MM" 24-hour
  end_time    text NOT NULL,   -- "HH:MM" 24-hour
  category    text,
  color       text,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_routine_blocks_routine ON routine_blocks(routine_id);

-- 3. Weekly schedule: assigns one routine (or NULL = rest day) to each day-of-week per user
--    day_of_week: 0=Sunday, 1=Monday, ... 6=Saturday
CREATE TABLE IF NOT EXISTS weekly_routine_schedule (
  id           SERIAL PRIMARY KEY,
  user_id      integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week  integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  routine_id   integer REFERENCES daily_routines(id) ON DELETE SET NULL,
  UNIQUE(user_id, day_of_week)
);
CREATE INDEX IF NOT EXISTS idx_weekly_routine_schedule_user ON weekly_routine_schedule(user_id);

-- 4. Per-block per-day completion log
CREATE TABLE IF NOT EXISTS daily_routine_logs (
  id                SERIAL PRIMARY KEY,
  user_id           integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  routine_block_id  integer REFERENCES routine_blocks(id) ON DELETE CASCADE NOT NULL,
  date              date NOT NULL,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('completed', 'skipped', 'missed')),
  logged_at         timestamptz DEFAULT now(),
  UNIQUE(user_id, routine_block_id, date)
);
CREATE INDEX IF NOT EXISTS idx_daily_routine_logs_user_date ON daily_routine_logs(user_id, date);

-- 5. Full-day skip (user explicitly skipped the whole day's routine)
CREATE TABLE IF NOT EXISTS daily_routine_skips (
  id          SERIAL PRIMARY KEY,
  user_id     integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date        date NOT NULL,
  reason      text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_daily_routine_skips_user_date ON daily_routine_skips(user_id, date);
