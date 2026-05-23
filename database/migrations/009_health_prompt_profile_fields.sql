-- 009: Add profile fields required by advanced health recommendation prompt
-- Adds age, gender, medical_conditions, and target_date to user_health_profiles

BEGIN;

ALTER TABLE IF EXISTS user_health_profiles
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS medical_conditions text,
  ADD COLUMN IF NOT EXISTS target_date date;

COMMIT;
