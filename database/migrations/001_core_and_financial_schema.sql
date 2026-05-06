-- ===================================================================
-- GoodDays Application - Core & Financial Schema
-- Migration: 001_core_and_financial_schema.sql
-- Description: Foundation tables (users, tasks, tracking) + Financial module
-- Run: psql -U postgres -d gooddays -f 001_core_and_financial_schema.sql
-- ===================================================================

BEGIN;

-- ===================================================================
-- CORE TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL,
  phone text,
  google_id text,
  level integer DEFAULT 1,
  points integer DEFAULT 0,
  theme text DEFAULT 'light',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  category text DEFAULT 'Personal',
  priority text DEFAULT 'medium',
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

-- Trigger: set default due_date
CREATE OR REPLACE FUNCTION set_default_due_date()
RETURNS trigger AS $$
BEGIN
  IF NEW.due_date IS NULL THEN
    IF NEW.recurring AND NEW.recurrence_start_date IS NOT NULL THEN
      NEW.due_date := NEW.recurrence_start_date;
    ELSE
      NEW.due_date := now()::date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tasks_default_due_date
BEFORE INSERT ON tasks
FOR EACH ROW EXECUTE FUNCTION set_default_due_date();

CREATE TABLE IF NOT EXISTS daily_top_three (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  task_1 text DEFAULT '',
  task_2 text DEFAULT '',
  task_3 text DEFAULT '',
  completed_1 boolean DEFAULT false,
  completed_2 boolean DEFAULT false,
  completed_3 boolean DEFAULT false,
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

CREATE TABLE IF NOT EXISTS focus_sessions (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  task_name text NOT NULL,
  duration integer NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  durationMinutes integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS study_resources (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_chapters (
  id SERIAL PRIMARY KEY,
  resource_id integer REFERENCES study_resources(id) ON DELETE CASCADE NOT NULL,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'not_started',
  video_link text,
  created_at timestamptz DEFAULT now()
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

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  category text DEFAULT 'Other',
  note text DEFAULT '',
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
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

-- Gamification function
CREATE OR REPLACE FUNCTION add_points(user_id integer, points_to_add integer)
RETURNS void AS $$
DECLARE
  new_points integer;
  new_level integer;
BEGIN
  UPDATE user_profiles
  SET points = points + points_to_add,
      updated_at = now()
  WHERE id = user_id
  RETURNING points INTO new_points;

  IF new_points >= 1500 THEN
    new_level := 5;
  ELSIF new_points >= 700 THEN
    new_level := 4;
  ELSIF new_points >= 300 THEN
    new_level := 3;
  ELSIF new_points >= 100 THEN
    new_level := 2;
  ELSE
    new_level := 1;
  END IF;

  UPDATE user_profiles
  SET level = new_level
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS gamification_entries (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  points integer NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ===================================================================
-- FINANCIAL LIFE TRACKER SCHEMA
-- ===================================================================

CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(12,2) NOT NULL,
    target_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS investment_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'EMERGENCY_FUND',
        'HEALTH',
        'TRAVEL',
        'MISCELLANEOUS',
        'WEALTH',
        'TRADING'
    )),
    monthly_target DECIMAL(10,2) NOT NULL DEFAULT 0,
    color_hex VARCHAR(7),
    icon VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id UUID NOT NULL REFERENCES investment_buckets(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN (
        'SIP_PAYMENT',
        'EMI_PAYMENT',
        'INSURANCE_REVIEW',
        'PORTFOLIO_REVIEW',
        'EMERGENCY_FUND_CHECK',
        'TRAVEL_FUND_CHECK',
        'CUSTOM'
    )) DEFAULT 'CUSTOM',
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_day INT CHECK (recurrence_day BETWEEN 1 AND 31),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_task_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES monthly_tasks(id) ON DELETE CASCADE,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year >= 2024),
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    actual_amount DECIMAL(10,2),
    notes VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_task_month_year UNIQUE (task_id, month, year)
);

CREATE TABLE IF NOT EXISTS financial_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'INVESTMENT',
        'TRADING',
        'MINDSET',
        'LIFESTYLE'
    )) DEFAULT 'MINDSET',
    display_style VARCHAR(50) NOT NULL CHECK (display_style IN (
        'BANNER',
        'CARD',
        'POPUP',
        'SIDEBAR'
    )) DEFAULT 'CARD',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year >= 2024),
    total_income DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_expenses DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_invested DECIMAL(10,2) NOT NULL DEFAULT 0,
    emergency_fund_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    travel_fund_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    portfolio_estimated_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_month_year UNIQUE (month, year)
);

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_daily_tracking_user_date ON daily_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON study_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_monthly_tasks_bucket_id ON monthly_tasks(bucket_id);
CREATE INDEX IF NOT EXISTS idx_monthly_tasks_is_active ON monthly_tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON monthly_task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_month_year ON monthly_task_completions(month, year);
CREATE INDEX IF NOT EXISTS idx_investment_buckets_is_active ON investment_buckets(is_active);
CREATE INDEX IF NOT EXISTS idx_financial_rules_category ON financial_rules(category);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_year_month ON monthly_snapshots(year DESC, month DESC);

COMMIT;
