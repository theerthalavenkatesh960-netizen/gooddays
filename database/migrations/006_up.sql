-- 006_up.sql
-- Persist user settings in DB (non-session preferences)

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS calorie_goal integer NOT NULL DEFAULT 2400;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS tracking_options_json jsonb NOT NULL DEFAULT '["sleep_hours","workout_minutes","phone_minutes"]'::jsonb;
