-- 006_down.sql
-- Rollback for user settings columns

ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS tracking_options_json;

ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS calorie_goal;
