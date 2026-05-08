-- Rollback: Water Tracking & Quick Log System
-- Migration 004 Rollback: Remove water intake tracking and quick log tables

DROP INDEX IF EXISTS idx_quick_log_created;
DROP INDEX IF EXISTS idx_quick_log_user_type;
DROP INDEX IF EXISTS idx_quick_log_user_date;
DROP TABLE IF EXISTS quick_log_entries;

DROP INDEX IF EXISTS idx_daily_water_logs_user_date;
DROP TABLE IF EXISTS daily_water_logs;
