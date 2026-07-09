-- ===================================================================
-- GoodDays Application - Full Database Rollback (DOWN)
-- Combined from migrations: 014 → 001 (reverse order)
-- WARNING: This will DELETE ALL DATA permanently!
-- Run: psql -U postgres -d gooddays -f all_down.sql
-- ===================================================================

BEGIN;

-- ===================================================================
-- 014 ROLLBACK: AI Chat tables
-- ===================================================================

DROP INDEX IF EXISTS idx_ai_messages_user_created;
DROP INDEX IF EXISTS idx_ai_messages_conversation_id;
DROP INDEX IF EXISTS idx_ai_conversations_user_id;

DROP TABLE IF EXISTS ai_messages;
DROP TABLE IF EXISTS ai_conversations;

-- ===================================================================
-- 010 ROLLBACK: Routine block templates
-- ===================================================================

DROP INDEX IF EXISTS idx_routine_blocks_template;
ALTER TABLE IF EXISTS routine_blocks DROP COLUMN IF EXISTS template_id;
DROP INDEX IF EXISTS idx_routine_block_templates_user;
DROP TABLE IF EXISTS routine_block_templates;

-- ===================================================================
-- 009 ROLLBACK: AI Planner
-- ===================================================================

DROP INDEX IF EXISTS idx_user_health_profiles_user_id;
DROP INDEX IF EXISTS idx_user_ai_settings_user_id;
DROP TABLE IF EXISTS user_health_profiles;
DROP TABLE IF EXISTS user_ai_settings;

-- ===================================================================
-- 008 ROLLBACK: Gmail Finance Sync
-- ===================================================================

DROP INDEX IF EXISTS ix_expenses_user_source_reviewed;
DROP INDEX IF EXISTS ix_expenses_user_external_reference;
DROP INDEX IF EXISTS ix_expenses_user_gmail_message_id;
DROP INDEX IF EXISTS ix_synced_emails_user_message;
DROP INDEX IF EXISTS ix_connected_email_accounts_user_provider;

DROP TABLE IF EXISTS synced_emails;
DROP TABLE IF EXISTS connected_email_accounts;

ALTER TABLE expenses
    DROP COLUMN IF EXISTS reviewed_at,
    DROP COLUMN IF EXISTS is_reviewed,
    DROP COLUMN IF EXISTS source_type,
    DROP COLUMN IF EXISTS external_reference,
    DROP COLUMN IF EXISTS gmail_message_id;

-- ===================================================================
-- 007 ROLLBACK: Advanced goals
-- ===================================================================

DROP INDEX IF EXISTS idx_goal_checklist_goal_completed;
DROP INDEX IF EXISTS idx_goal_checklist_goal_position;
DROP TABLE IF EXISTS goal_checklist_items;

ALTER TABLE flashcards
  DROP COLUMN IF EXISTS next_review,
  DROP COLUMN IF EXISTS last_reviewed,
  DROP COLUMN IF EXISTS confidence_level,
  DROP COLUMN IF EXISTS topic;

ALTER TABLE goal_daily_logs
  DROP COLUMN IF EXISTS value_delta;

ALTER TABLE goals
  DROP COLUMN IF EXISTS completed_at,
  DROP COLUMN IF EXISTS auto_complete,
  DROP COLUMN IF EXISTS deadline_date,
  DROP COLUMN IF EXISTS start_date,
  DROP COLUMN IF EXISTS unit,
  DROP COLUMN IF EXISTS current_value,
  DROP COLUMN IF EXISTS target_value,
  DROP COLUMN IF EXISTS goal_type;

-- ===================================================================
-- 006 ROLLBACK: User settings columns
-- ===================================================================

ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS tracking_options_json;

ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS dashboard_weights_json;

ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS dashboard_preset;

ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS calorie_goal;

-- ===================================================================
-- 005 ROLLBACK: Daily meal logs
-- ===================================================================

DROP INDEX IF EXISTS idx_daily_meal_logs_user_date;
DROP TABLE IF EXISTS daily_meal_logs;

-- ===================================================================
-- 004 ROLLBACK: Water tracking & quick log
-- ===================================================================

DROP INDEX IF EXISTS idx_quick_log_created;
DROP INDEX IF EXISTS idx_quick_log_user_type;
DROP INDEX IF EXISTS idx_quick_log_user_date;
DROP TABLE IF EXISTS quick_log_entries;

DROP INDEX IF EXISTS idx_daily_water_logs_user_date;
DROP TABLE IF EXISTS daily_water_logs;

-- ===================================================================
-- 003 ROLLBACK: Daily routine system
-- ===================================================================

DROP INDEX IF EXISTS idx_daily_routine_skips_user_date;
DROP INDEX IF EXISTS idx_daily_routine_logs_user_date;
DROP INDEX IF EXISTS idx_weekly_routine_schedule_user;
DROP INDEX IF EXISTS idx_routine_block_meal_links_meal;
DROP INDEX IF EXISTS idx_routine_block_meal_links_block;
DROP INDEX IF EXISTS idx_routine_blocks_workout_plan;
DROP INDEX IF EXISTS idx_routine_blocks_routine;
DROP INDEX IF EXISTS idx_daily_routines_user;

DROP TABLE IF EXISTS daily_routine_skips;
DROP TABLE IF EXISTS daily_routine_logs;
DROP TABLE IF EXISTS weekly_routine_schedule;
DROP TABLE IF EXISTS routine_block_meal_links;
DROP TABLE IF EXISTS routine_blocks;
DROP TABLE IF EXISTS daily_routines;

-- ===================================================================
-- 002 ROLLBACK: Meal planner
-- ===================================================================

DROP INDEX IF EXISTS idx_weekly_meal_plans_user_id;
DROP INDEX IF EXISTS idx_meal_templates_user_id;
DROP INDEX IF EXISTS idx_meal_ingredients_user_id;
DROP INDEX IF EXISTS ux_meal_ingredients_user_name_ci;
DROP INDEX IF EXISTS ux_meal_ingredients_name_ci;

DROP TABLE IF EXISTS weekly_meal_plans;
DROP TABLE IF EXISTS meal_templates;
DROP TABLE IF EXISTS meal_ingredients;

-- ===================================================================
-- 001 ROLLBACK: Core tables
-- ===================================================================

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
DROP TABLE IF EXISTS finance_fixed_expense_overrides CASCADE;
DROP TABLE IF EXISTS finance_monthly_income_overrides CASCADE;
DROP TABLE IF EXISTS finance_fixed_expenses CASCADE;
DROP TABLE IF EXISTS finance_budget_profiles CASCADE;
DROP TABLE IF EXISTS financial_rules CASCADE;
DROP TABLE IF EXISTS monthly_task_completions CASCADE;
DROP TABLE IF EXISTS monthly_tasks CASCADE;
DROP TABLE IF EXISTS bucket_contributions CASCADE;
DROP TABLE IF EXISTS investment_buckets CASCADE;
DROP TABLE IF EXISTS financial_goals CASCADE;
DROP TABLE IF EXISTS gamification_entries CASCADE;
DROP TABLE IF EXISTS self_care_logs CASCADE;
DROP TABLE IF EXISTS self_care_template CASCADE;
DROP TABLE IF EXISTS study_sessions CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS daily_notes CASCADE;
DROP TABLE IF EXISTS self_care_logs CASCADE;
DROP TABLE IF EXISTS self_care_template CASCADE;
DROP TABLE IF EXISTS study_sessions CASCADE;
DROP TABLE IF EXISTS daily_tracking CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

COMMIT;
