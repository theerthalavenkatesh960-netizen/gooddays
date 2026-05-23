-- 009: Add profile fields required by advanced health recommendation prompt
-- Adds age, gender, and medical_conditions to user_health_profiles

BEGIN;

ALTER TABLE IF EXISTS user_health_profiles
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS medical_conditions text;

COMMIT;
