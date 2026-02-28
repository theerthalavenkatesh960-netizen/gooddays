-- safe undo script for all migrations
-- drops every user-defined table and function created by the GoodDays schema
-- run this only in development or on a disposable database, not in production.
-- ordering is chosen to satisfy foreign key dependencies.

DROP TABLE IF EXISTS self_care_logs;
DROP TABLE IF EXISTS self_care_template;
DROP TABLE IF EXISTS expenses;

DROP TABLE IF EXISTS study_chapters;
DROP TABLE IF EXISTS study_resources;
DROP TABLE IF EXISTS study_sessions;

DROP TABLE IF EXISTS thesis_patients;
DROP TABLE IF EXISTS thesis_settings;

DROP TABLE IF EXISTS daily_tracking;

DROP TABLE IF EXISTS focus_sessions;
DROP TABLE IF EXISTS daily_notes;
DROP TABLE IF EXISTS daily_top_three;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS user_profiles;

-- if there are any custom functions they can also be dropped here
-- example: DROP FUNCTION IF EXISTS some_gamification_function();

-- policies and RLS are removed automatically when tables are dropped
