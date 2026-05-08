-- ===================================================================
-- GoodDays Application - Full Database Schema (UP)
-- Combined from migrations: 001 → 007
-- Description: Creates the complete schema (all tables, indexes)
-- Run: psql -U postgres -d gooddays -f all_up.sql
-- ===================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===================================================================
-- 001: CORE TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL DEFAULT '',
  phone text,
  google_id text,
  level integer DEFAULT 1,
  points integer DEFAULT 0,
  theme text DEFAULT 'light',
  dashboard_preset text DEFAULT 'balanced',
  dashboard_weights_json text DEFAULT '{"tasks":35,"routine":20,"body":15,"workout":15,"finance":10,"journal":5}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  category text,
  priority text,
  due_date date,
  recurring boolean DEFAULT false,
  recurrence_start_date date,
  recurrence_end_date date,
  recurrence_interval integer,
  recurrence_unit text,
  recurrence_days text[],
  recurrence_id integer,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS daily_tracking (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  sleepHours numeric DEFAULT 0,
  workoutMinutes integer DEFAULT 0,
  phoneMinutes integer DEFAULT 0,
  sunlight boolean DEFAULT false,
  mood integer DEFAULT 3,
  waterCups integer DEFAULT 0,
  waterGoalCups integer DEFAULT 8,
  calories integer DEFAULT 0,
  note text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS daily_notes (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  note text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  category text,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gamification_entries (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  points integer NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS investment_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'EMERGENCY_FUND', 'HEALTH', 'TRAVEL', 'MISCELLANEOUS', 'WEALTH', 'TRADING'
  )),
  monthly_target DECIMAL(10,2) DEFAULT 0,
  target_amount DECIMAL(12,2) DEFAULT 0,
  current_amount DECIMAL(12,2) DEFAULT 0,
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'weekly', 'quarterly')),
  period_months INT DEFAULT 0,
  invested_in VARCHAR(200),
  color_hex VARCHAR(7),
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bucket_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id UUID NOT NULL REFERENCES investment_buckets(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  note VARCHAR(500),
  contribution_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id UUID NOT NULL REFERENCES investment_buckets(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) CHECK (task_type IN (
    'SIP_PAYMENT', 'EMI_PAYMENT', 'INSURANCE_REVIEW',
    'PORTFOLIO_REVIEW', 'EMERGENCY_FUND_CHECK', 'TRAVEL_FUND_CHECK', 'CUSTOM'
  )) DEFAULT 'CUSTOM',
  amount DECIMAL(10,2) DEFAULT 0,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_day INT CHECK (recurrence_day BETWEEN 1 AND 31),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES monthly_tasks(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL CHECK (year >= 2024),
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  actual_amount DECIMAL(10,2),
  notes VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_task_month_year UNIQUE (task_id, month, year)
);

CREATE TABLE IF NOT EXISTS financial_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('INVESTMENT', 'TRADING', 'MINDSET', 'LIFESTYLE')) DEFAULT 'MINDSET',
  display_style VARCHAR(50) CHECK (display_style IN ('BANNER', 'CARD', 'POPUP', 'SIDEBAR')) DEFAULT 'CARD',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL CHECK (year >= 2024),
  total_income DECIMAL(10,2) DEFAULT 0,
  total_expenses DECIMAL(10,2) DEFAULT 0,
  total_invested DECIMAL(10,2) DEFAULT 0,
  emergency_fund_balance DECIMAL(10,2) DEFAULT 0,
  travel_fund_balance DECIMAL(10,2) DEFAULT 0,
  portfolio_estimated_value DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_month_year UNIQUE (month, year)
);

CREATE TABLE IF NOT EXISTS finance_budget_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_income DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_fixed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES finance_budget_profiles(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_monthly_income_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES finance_budget_profiles(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL CHECK (year >= 2000),
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_profile_month_year_income_override UNIQUE (profile_id, month, year)
);

CREATE TABLE IF NOT EXISTS finance_fixed_expense_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixed_expense_id UUID NOT NULL REFERENCES finance_fixed_expenses(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL CHECK (year >= 2000),
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_fixed_expense_month_year_override UNIQUE (fixed_expense_id, month, year)
);

CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  name text NOT NULL,
  muscle_group text NOT NULL,
  description text,
  image_url text,
  is_custom boolean DEFAULT false,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_split_presets (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  day_configs text DEFAULT '{}',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_day_plans (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  day_label text,
  split_preset_id integer REFERENCES workout_split_presets(id) ON DELETE SET NULL,
  planned_exercises text DEFAULT '[]',
  is_completed boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id SERIAL PRIMARY KEY,
  workout_day_plan_id integer REFERENCES workout_day_plans(id) ON DELETE CASCADE NOT NULL,
  exercise_id integer REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  set_number integer NOT NULL,
  reps integer,
  weight_kg numeric,
  duration_seconds integer,
  is_completed boolean DEFAULT false,
  notes text,
  logged_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_day_images (
  id SERIAL PRIMARY KEY,
  workout_day_plan_id integer REFERENCES workout_day_plans(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  caption text,
  uploaded_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS personal_records (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  exercise_id integer REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  max_weight_kg numeric NOT NULL,
  reps integer NOT NULL,
  achieved_at timestamptz NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  category text,
  color text,
  icon text,
  target_date date,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goal_notes (
  id SERIAL PRIMARY KEY,
  goal_id integer REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  title text DEFAULT 'Untitled Note',
  content text DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goal_daily_logs (
  id SERIAL PRIMARY KEY,
  goal_id integer REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  content text,
  minutes_spent integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flashcards (
  id SERIAL PRIMARY KEY,
  goal_id integer REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  front text NOT NULL,
  back text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  time text DEFAULT '08:00',
  frequency text DEFAULT 'daily',
  active_days text DEFAULT '[]',
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reminder_logs (
  id SERIAL PRIMARY KEY,
  reminder_id integer REFERENCES reminders(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  marked_done boolean DEFAULT false,
  marked_done_at timestamptz
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  title text,
  body text,
  mood_tag text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weekly_reviews (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  week_start_date date NOT NULL,
  tasks_completed integer DEFAULT 0,
  workout_days integer DEFAULT 0,
  study_hours numeric DEFAULT 0,
  self_care_percent integer DEFAULT 0,
  habits_percent integer DEFAULT 0,
  mood_avg numeric DEFAULT 0,
  total_spend numeric DEFAULT 0,
  wins text,
  improvements text,
  next_week_focus text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 001 indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_daily_tracking_user_date ON daily_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_notes_user_date ON daily_notes(user_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_entries_user_id ON gamification_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_income_overrides_profile_period ON finance_monthly_income_overrides(profile_id, month, year);
CREATE INDEX IF NOT EXISTS idx_fixed_expense_overrides_expense_period ON finance_fixed_expense_overrides(fixed_expense_id, month, year);
CREATE INDEX IF NOT EXISTS idx_investment_buckets_is_active ON investment_buckets(is_active);
CREATE INDEX IF NOT EXISTS idx_monthly_tasks_bucket_id ON monthly_tasks(bucket_id);
CREATE INDEX IF NOT EXISTS idx_monthly_tasks_completions_task_id ON monthly_task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_monthly_tasks_completions_month_year ON monthly_task_completions(month, year);
CREATE INDEX IF NOT EXISTS idx_financial_rules_category ON financial_rules(category);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_year_month ON monthly_snapshots(year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_finance_fixed_expenses_profile_sort ON finance_fixed_expenses(profile_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_split_presets_user_id ON workout_split_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_day_plans_user_date ON workout_day_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_day_plan_id ON workout_sets(workout_day_plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_day_images_workout_day_plan_id ON workout_day_images(workout_day_plan_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_user_id ON personal_records(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_exercise_id ON personal_records(exercise_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goal_notes_goal_id ON goal_notes(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_daily_logs_goal_date ON goal_daily_logs(goal_id, date);
CREATE INDEX IF NOT EXISTS idx_flashcards_goal_id ON flashcards(goal_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder_date ON reminder_logs(reminder_id, date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user_week ON weekly_reviews(user_id, week_start_date);

-- ===================================================================
-- 002: MEAL PLANNER
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

CREATE TABLE IF NOT EXISTS weekly_meal_plans (
  id SERIAL PRIMARY KEY,
  user_id integer UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  plan_json text DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_ingredients_user_id ON meal_ingredients(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_templates_user_id ON meal_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_meal_plans_user_id ON weekly_meal_plans(user_id);

-- ===================================================================
-- 003: DAILY ROUTINE SYSTEM
-- ===================================================================

CREATE TABLE IF NOT EXISTS daily_routines (
  id         SERIAL PRIMARY KEY,
  user_id    integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name       text NOT NULL,
  description text,
  color      text DEFAULT '#6C63FF',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routine_blocks (
  id         SERIAL PRIMARY KEY,
  routine_id integer REFERENCES daily_routines(id) ON DELETE CASCADE NOT NULL,
  title      text NOT NULL,
  start_time text NOT NULL,
  end_time   text NOT NULL,
  category   text,
  color      text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weekly_routine_schedule (
  id          SERIAL PRIMARY KEY,
  user_id     integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  routine_id  integer REFERENCES daily_routines(id) ON DELETE SET NULL,
  UNIQUE(user_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS daily_routine_logs (
  id               SERIAL PRIMARY KEY,
  user_id          integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  routine_block_id integer REFERENCES routine_blocks(id) ON DELETE CASCADE NOT NULL,
  date             date NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('completed', 'skipped', 'missed')),
  logged_at        timestamptz DEFAULT now(),
  UNIQUE(user_id, routine_block_id, date)
);

CREATE TABLE IF NOT EXISTS daily_routine_skips (
  id         SERIAL PRIMARY KEY,
  user_id    integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date       date NOT NULL,
  reason     text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_routines_user ON daily_routines(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_blocks_routine ON routine_blocks(routine_id);
CREATE INDEX IF NOT EXISTS idx_weekly_routine_schedule_user ON weekly_routine_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_routine_logs_user_date ON daily_routine_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_routine_skips_user_date ON daily_routine_skips(user_id, date);

-- ===================================================================
-- 004: WATER TRACKING & QUICK LOG
-- ===================================================================

CREATE TABLE IF NOT EXISTS daily_water_logs (
  id          SERIAL PRIMARY KEY,
  user_id     integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date        date NOT NULL,
  ml_consumed integer NOT NULL DEFAULT 0,
  goal_ml     integer NOT NULL DEFAULT 2000,
  unit        text NOT NULL DEFAULT 'ml' CHECK (unit IN ('ml', 'l')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS quick_log_entries (
  id           SERIAL PRIMARY KEY,
  user_id      integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date         date NOT NULL,
  type         text NOT NULL CHECK (type IN ('workout', 'meal', 'expense', 'water', 'task')),
  payload_json jsonb NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_water_logs_user_date ON daily_water_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_quick_log_user_date ON quick_log_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_quick_log_user_type ON quick_log_entries(user_id, type);
CREATE INDEX IF NOT EXISTS idx_quick_log_created ON quick_log_entries(created_at);

-- ===================================================================
-- 005: DAILY MEAL LOGS
-- ===================================================================

CREATE TABLE IF NOT EXISTS daily_meal_logs (
  id            SERIAL PRIMARY KEY,
  user_id       integer NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date          date NOT NULL,
  meal_ids_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_meal_logs_user_date ON daily_meal_logs(user_id, date);

-- ===================================================================
-- 006: USER SETTINGS COLUMNS
-- ===================================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS calorie_goal integer NOT NULL DEFAULT 2400;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS tracking_options_json jsonb NOT NULL DEFAULT '["sleep_hours","workout_minutes","phone_minutes"]'::jsonb;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS dashboard_preset text NOT NULL DEFAULT 'balanced';

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS dashboard_weights_json jsonb NOT NULL DEFAULT '{"tasks":35,"routine":20,"body":15,"workout":15,"finance":10,"journal":5}'::jsonb;

-- ===================================================================
-- 007: ADVANCED GOALS (checklist + milestone support)
-- ===================================================================

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS goal_type text NOT NULL DEFAULT 'checklist',
  ADD COLUMN IF NOT EXISTS target_value numeric(18,2),
  ADD COLUMN IF NOT EXISTS current_value numeric(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS deadline_date date,
  ADD COLUMN IF NOT EXISTS auto_complete boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE goal_daily_logs
  ADD COLUMN IF NOT EXISTS value_delta numeric(18,2);

ALTER TABLE flashcards
  ADD COLUMN IF NOT EXISTS topic text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS confidence_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reviewed timestamptz,
  ADD COLUMN IF NOT EXISTS next_review timestamptz;

CREATE TABLE IF NOT EXISTS goal_checklist_items (
  id           SERIAL PRIMARY KEY,
  goal_id      integer REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  title        text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  position     integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goal_checklist_goal_position ON goal_checklist_items(goal_id, position);
CREATE INDEX IF NOT EXISTS idx_goal_checklist_goal_completed ON goal_checklist_items(goal_id, is_completed);

COMMIT;
