-- 008: AI Planner settings and health profile tables

BEGIN;

CREATE TABLE IF NOT EXISTS user_ai_settings (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'local-llama',
  local_endpoint text NOT NULL DEFAULT 'http://localhost:11434',
  local_model text NOT NULL DEFAULT 'llama3.1:8b',
  claude_api_key text,
  claude_model text NOT NULL DEFAULT 'claude-3-5-sonnet-latest',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS user_ai_settings
  ADD COLUMN IF NOT EXISTS local_model text NOT NULL DEFAULT 'llama3.1:8b',
  ADD COLUMN IF NOT EXISTS claude_api_key text,
  ADD COLUMN IF NOT EXISTS claude_model text NOT NULL DEFAULT 'claude-3-5-sonnet-latest';

CREATE TABLE IF NOT EXISTS user_health_profiles (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  height_cm decimal(5,1),
  weight_kg decimal(5,2),
  target_weight_kg decimal(5,2),
  daily_calories_target integer,
  diet_preference text,
  budget_per_week decimal(10,2),
  activity_level text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_ai_settings_user_id ON user_ai_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_health_profiles_user_id ON user_health_profiles(user_id);

COMMIT;
