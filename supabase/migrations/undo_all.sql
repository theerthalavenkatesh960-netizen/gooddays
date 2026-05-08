-- safe undo script for all migrations
-- drops every user-defined table and function created by the GoodDays schema
-- run this only in development or on a disposable database, not in production.
-- ordering is chosen to satisfy foreign key dependencies.

BEGIN;

-- Thesis module tables
DROP TABLE IF EXISTS thesis_deadlines;
DROP TABLE IF EXISTS thesis_documents;
DROP TABLE IF EXISTS thesis_followups;
DROP TABLE IF EXISTS thesis_patients;
DROP TABLE IF EXISTS thesis_protocols;
DROP TABLE IF EXISTS study_groups;
DROP TABLE IF EXISTS thesis_settings;

-- Self-care tables
DROP TABLE IF EXISTS self_care_logs;
DROP TABLE IF EXISTS self_care_template;

-- Expenses
DROP TABLE IF EXISTS expenses;

-- Study tables
DROP TABLE IF EXISTS study_chapters;
DROP TABLE IF EXISTS study_resources;
DROP TABLE IF EXISTS study_sessions;

-- Daily tracking
DROP TABLE IF EXISTS daily_tracking;

-- Daily tables
DROP TABLE IF EXISTS focus_sessions;
DROP TABLE IF EXISTS daily_notes;
DROP TABLE IF EXISTS daily_top_three;

-- Core tables
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS gamification_entries;
DROP TABLE IF EXISTS user_profiles;

-- Drop functions and triggers
DROP TRIGGER IF EXISTS trg_tasks_default_due_date ON tasks;
DROP FUNCTION IF EXISTS set_default_due_date();
DROP FUNCTION IF EXISTS add_points(integer, integer);

COMMIT;

-- Note: RLS policies and auth-related code have been removed
-- All authorization is now handled at the application level
