-- ===================================================================
-- GoodDays Application - Rollback Script
-- Migration: 000_rollback_all.sql
-- Description: Removes all tables and functions (for cleanup/testing)
-- WARNING: This will delete all data!
-- Run: psql -U postgres -d gooddays -f 000_rollback_all.sql
-- ===================================================================

BEGIN;

-- Drop all tables (cascade deletes related data)
DROP TABLE IF EXISTS monthly_snapshots CASCADE;
DROP TABLE IF EXISTS financial_rules CASCADE;
DROP TABLE IF EXISTS monthly_task_completions CASCADE;
DROP TABLE IF EXISTS monthly_tasks CASCADE;
DROP TABLE IF EXISTS investment_buckets CASCADE;
DROP TABLE IF EXISTS financial_goals CASCADE;
DROP TABLE IF EXISTS study_group_members CASCADE;
DROP TABLE IF EXISTS study_groups CASCADE;
DROP TABLE IF EXISTS dashboard_snapshots CASCADE;
DROP TABLE IF EXISTS followups CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS deadlines CASCADE;
DROP TABLE IF EXISTS thesis_stats CASCADE;
DROP TABLE IF EXISTS thesis_followups CASCADE;
DROP TABLE IF EXISTS thesis_documents CASCADE;
DROP TABLE IF EXISTS thesis_deadlines CASCADE;
DROP TABLE IF EXISTS thesis_patients CASCADE;
DROP TABLE IF EXISTS thesis_protocols CASCADE;
DROP TABLE IF EXISTS reflection_prompts CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS goal_milestones CASCADE;
DROP TABLE IF EXISTS personal_goals CASCADE;
DROP TABLE IF EXISTS workout_templates CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS gamification_entries CASCADE;
DROP TABLE IF EXISTS self_care_logs CASCADE;
DROP TABLE IF EXISTS self_care_template CASCADE;
DROP TABLE IF EXISTS study_chapters CASCADE;
DROP TABLE IF EXISTS study_resources CASCADE;
DROP TABLE IF EXISTS study_sessions CASCADE;
DROP TABLE IF EXISTS focus_sessions CASCADE;
DROP TABLE IF EXISTS daily_notes CASCADE;
DROP TABLE IF EXISTS daily_top_three CASCADE;
DROP TABLE IF EXISTS daily_tracking CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS add_points(integer, integer) CASCADE;
DROP FUNCTION IF EXISTS set_default_due_date() CASCADE;

-- Drop all triggers
DROP TRIGGER IF EXISTS trg_tasks_default_due_date ON tasks CASCADE;

COMMIT;
