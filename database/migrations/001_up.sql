-- ===================================================================
-- GoodDays Application - Database Schema (UP)
-- Migration: 001_up.sql
-- Description: Creates all application tables (29 tables)
-- Tables: Core, Financial, Workouts, Goals, Reminders, Journal, Weekly Review
-- Run: psql -U postgres -d gooddays -f 001_up.sql
-- ===================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===================================================================
-- CORE: USER PROFILES
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ===================================================================
-- CORE: TASK MANAGEMENT
-- ===================================================================

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

-- ===================================================================
-- CORE: DAILY TRACKING & WELLNESS
-- ===================================================================

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

-- ===================================================================
-- CORE: STUDY & SELF-CARE
-- ===================================================================

CREATE TABLE IF NOT EXISTS study_sessions (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  durationMinutes integer DEFAULT 0,
  notes text DEFAULT '',
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS self_care_template (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  item text NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS self_care_logs (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  template_id integer REFERENCES self_care_template(id) ON DELETE CASCADE NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date, template_id)
);

-- ===================================================================
-- CORE: GAMIFICATION
-- ===================================================================

CREATE TABLE IF NOT EXISTS gamification_entries (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  points integer NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ===================================================================
-- FINANCIAL MODULE TABLES
-- ===================================================================

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
  color_hex VARCHAR(7),
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
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

-- ===================================================================
-- WORKOUT TRACKER TABLES
-- ===================================================================

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

-- ===================================================================
-- GOALS & TRACKING TABLES
-- ===================================================================

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

-- ===================================================================
-- REMINDERS & NOTIFICATIONS
-- ===================================================================

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

-- ===================================================================
-- JOURNAL & REFLECTION
-- ===================================================================

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

-- ===================================================================
-- WEEKLY REVIEW
-- ===================================================================

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

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_daily_tracking_user_date ON daily_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_notes_user_date ON daily_notes(user_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON study_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_self_care_template_user_id ON self_care_template(user_id);
CREATE INDEX IF NOT EXISTS idx_self_care_logs_user_date ON self_care_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_gamification_entries_user_id ON gamification_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_investment_buckets_is_active ON investment_buckets(is_active);
CREATE INDEX IF NOT EXISTS idx_monthly_tasks_bucket_id ON monthly_tasks(bucket_id);
CREATE INDEX IF NOT EXISTS idx_monthly_tasks_completions_task_id ON monthly_task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_monthly_tasks_completions_month_year ON monthly_task_completions(month, year);
CREATE INDEX IF NOT EXISTS idx_financial_rules_category ON financial_rules(category);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_year_month ON monthly_snapshots(year DESC, month DESC);

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

COMMIT;
