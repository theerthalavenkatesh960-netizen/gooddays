-- 005_down.sql
-- Rollback for daily meal logs

DROP INDEX IF EXISTS idx_daily_meal_logs_user_date;
DROP TABLE IF EXISTS daily_meal_logs;
