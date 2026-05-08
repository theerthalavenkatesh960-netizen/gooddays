-- ===================================================================
-- GoodDays Application - Database Schema (UP)
-- Migration: 002_up.sql
-- Description: Creates meal planner tables (3 tables)
-- Tables: meal_ingredients, meal_templates, weekly_meal_plans
-- Run: psql -U postgres -d gooddays -f 002_up.sql
-- ===================================================================

BEGIN;

-- ===================================================================
-- MEAL PLANNER: INGREDIENTS
-- ===================================================================

CREATE TABLE IF NOT EXISTS meal_ingredients (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  calories_kcal integer NOT NULL DEFAULT 0,
  protein_g double precision NOT NULL DEFAULT 0,
  carbs_g double precision NOT NULL DEFAULT 0,
  fats_g double precision NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_ingredients_user_id ON meal_ingredients(user_id);

-- ===================================================================
-- MEAL PLANNER: MEAL TEMPLATES
-- ===================================================================

CREATE TABLE IF NOT EXISTS meal_templates (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  timing text NOT NULL DEFAULT 'breakfast',
  ingredients_json text DEFAULT '[]',
  recipe text DEFAULT '',
  image_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_templates_user_id ON meal_templates(user_id);

-- ===================================================================
-- MEAL PLANNER: WEEKLY MEAL PLAN
-- ===================================================================

CREATE TABLE IF NOT EXISTS weekly_meal_plans (
  id SERIAL PRIMARY KEY,
  user_id integer UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  plan_json text DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_meal_plans_user_id ON weekly_meal_plans(user_id);

COMMIT;
