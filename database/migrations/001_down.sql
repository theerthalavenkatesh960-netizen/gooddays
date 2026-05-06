-- ===================================================================
-- GoodDays Application - Database Schema (DOWN)
-- Migration: 001_down.sql
-- Description: Removes all application tables (rollback)
-- WARNING: This will delete all data!
-- Run: psql -U postgres -d gooddays -f 001_down.sql
-- ===================================================================

BEGIN;

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS weekly_reviews CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS reminder_logs CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS flashcards CASCADE;
DROP TABLE IF EXISTS goal_daily_logs CASCADE;
DROP TABLE IF EXISTS goal_notes CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS personal_records CASCADE;
DROP TABLE IF EXISTS workout_day_images CASCADE;
DROP TABLE IF EXISTS workout_sets CASCADE;
DROP TABLE IF EXISTS workout_day_plans CASCADE;
DROP TABLE IF EXISTS workout_split_presets CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS monthly_snapshots CASCADE;
DROP TABLE IF EXISTS financial_rules CASCADE;
DROP TABLE IF EXISTS monthly_task_completions CASCADE;
DROP TABLE IF EXISTS monthly_tasks CASCADE;
DROP TABLE IF EXISTS investment_buckets CASCADE;
DROP TABLE IF EXISTS financial_goals CASCADE;
DROP TABLE IF EXISTS gamification_entries CASCADE;
DROP TABLE IF EXISTS self_care_logs CASCADE;
DROP TABLE IF EXISTS self_care_template CASCADE;
DROP TABLE IF EXISTS study_sessions CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS daily_notes CASCADE;
DROP TABLE IF EXISTS daily_tracking CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop all indexes (optional, dropped with tables above)
DROP INDEX IF EXISTS idx_user_profiles_email CASCADE;
DROP INDEX IF EXISTS idx_tasks_user_id CASCADE;
DROP INDEX IF EXISTS idx_tasks_due_date CASCADE;
DROP INDEX IF EXISTS idx_daily_tracking_user_date CASCADE;
DROP INDEX IF EXISTS idx_daily_notes_user_date CASCADE;
DROP INDEX IF EXISTS idx_expenses_user_id CASCADE;
DROP INDEX IF EXISTS idx_study_sessions_user_date CASCADE;
DROP INDEX IF EXISTS idx_self_care_template_user_id CASCADE;
DROP INDEX IF EXISTS idx_self_care_logs_user_date CASCADE;
DROP INDEX IF EXISTS idx_gamification_entries_user_id CASCADE;
DROP INDEX IF EXISTS idx_investment_buckets_is_active CASCADE;
DROP INDEX IF EXISTS idx_monthly_tasks_bucket_id CASCADE;
DROP INDEX IF EXISTS idx_monthly_tasks_completions_task_id CASCADE;
DROP INDEX IF EXISTS idx_monthly_tasks_completions_month_year CASCADE;
DROP INDEX IF EXISTS idx_financial_rules_category CASCADE;
DROP INDEX IF EXISTS idx_monthly_snapshots_year_month CASCADE;
DROP INDEX IF EXISTS idx_exercises_user_id CASCADE;
DROP INDEX IF EXISTS idx_workout_split_presets_user_id CASCADE;
DROP INDEX IF EXISTS idx_workout_day_plans_user_date CASCADE;
DROP INDEX IF EXISTS idx_workout_sets_workout_day_plan_id CASCADE;
DROP INDEX IF EXISTS idx_workout_day_images_workout_day_plan_id CASCADE;
DROP INDEX IF EXISTS idx_personal_records_user_id CASCADE;
DROP INDEX IF EXISTS idx_personal_records_exercise_id CASCADE;
DROP INDEX IF EXISTS idx_goals_user_id CASCADE;
DROP INDEX IF EXISTS idx_goals_status CASCADE;
DROP INDEX IF EXISTS idx_goal_notes_goal_id CASCADE;
DROP INDEX IF EXISTS idx_goal_daily_logs_goal_date CASCADE;
DROP INDEX IF EXISTS idx_flashcards_goal_id CASCADE;
DROP INDEX IF EXISTS idx_reminders_user_id CASCADE;
DROP INDEX IF EXISTS idx_reminder_logs_reminder_date CASCADE;
DROP INDEX IF EXISTS idx_journal_entries_user_date CASCADE;
DROP INDEX IF EXISTS idx_weekly_reviews_user_week CASCADE;

COMMIT;
