-- Migration 003 rollback: drop daily routine tables in reverse FK order
DROP TABLE IF EXISTS daily_routine_skips;
DROP TABLE IF EXISTS daily_routine_logs;
DROP TABLE IF EXISTS weekly_routine_schedule;
DROP TABLE IF EXISTS routine_blocks;
DROP TABLE IF EXISTS daily_routines;
