-- ===================================================================
-- GoodDays Application - Database Schema (DOWN)
-- Migration: 002_down.sql
-- Description: Removes meal planner tables (rollback)
-- WARNING: This will delete all meal data!
-- Run: psql -U postgres -d gooddays -f 002_down.sql
-- ===================================================================

BEGIN;

-- Drop all meal-related tables in reverse dependency order
DROP TABLE IF EXISTS weekly_meal_plans CASCADE;
DROP TABLE IF EXISTS meal_templates CASCADE;
DROP TABLE IF EXISTS meal_ingredients CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_weekly_meal_plans_user_id CASCADE;
DROP INDEX IF EXISTS idx_meal_templates_user_id CASCADE;
DROP INDEX IF EXISTS idx_meal_ingredients_user_id CASCADE;

COMMIT;
