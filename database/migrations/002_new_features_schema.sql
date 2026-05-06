-- ===================================================================
-- GoodDays Application - New Features Schema (Phase 2-5)
-- Migration: 002_new_features_schema.sql
-- Description: Workout, Goals, Reminders, Journal, Thesis, and Patient tracking
-- Run: psql -U postgres -d gooddays -f 002_new_features_schema.sql
-- ===================================================================

BEGIN;

-- ===================================================================
-- WORKOUT & FITNESS TRACKING
-- ===================================================================

CREATE TABLE IF NOT EXISTS workouts (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  exercise_name text NOT NULL,
  duration integer NOT NULL,
  intensity text DEFAULT 'moderate',
  calories_burned integer,
  notes text DEFAULT '',
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date, exercise_name)
);

CREATE TABLE IF NOT EXISTS workout_templates (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  exercises jsonb NOT NULL,
  difficulty text DEFAULT 'moderate',
  duration integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ===================================================================
-- GOALS & ASPIRATIONS
-- ===================================================================

CREATE TABLE IF NOT EXISTS personal_goals (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL,
  target_date date,
  status text DEFAULT 'active',
  priority text DEFAULT 'medium',
  progress integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS goal_milestones (
  id SERIAL PRIMARY KEY,
  goal_id integer REFERENCES personal_goals(id) ON DELETE CASCADE NOT NULL,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  target_date date,
  completed_at timestamptz,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ===================================================================
-- REMINDERS & NOTIFICATIONS
-- ===================================================================

CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  reminder_type text NOT NULL,
  scheduled_time timestamptz NOT NULL,
  frequency text DEFAULT 'once',
  is_active boolean DEFAULT true,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text DEFAULT '',
  is_read boolean DEFAULT false,
  action_url text,
  created_at timestamptz DEFAULT now()
);

-- ===================================================================
-- JOURNALING & REFLECTIONS
-- ===================================================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  mood integer DEFAULT 3,
  tags text[] DEFAULT '{}',
  is_private boolean DEFAULT true,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS reflection_prompts (
  id SERIAL PRIMARY KEY,
  category text NOT NULL,
  prompt text NOT NULL,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ===================================================================
-- THESIS RESEARCH TRACKING
-- ===================================================================

CREATE TABLE IF NOT EXISTS thesis_protocols (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS thesis_patients (
  id SERIAL PRIMARY KEY,
  protocol_id integer REFERENCES thesis_protocols(id) ON DELETE CASCADE NOT NULL,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  patient_id text NOT NULL,
  age integer,
  gender text,
  diagnosis text DEFAULT '',
  enrollment_date date,
  status text DEFAULT 'active',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(protocol_id, patient_id)
);

CREATE TABLE IF NOT EXISTS thesis_deadlines (
  id SERIAL PRIMARY KEY,
  protocol_id integer REFERENCES thesis_protocols(id) ON DELETE CASCADE NOT NULL,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  milestone text NOT NULL,
  deadline date NOT NULL,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  completed_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS thesis_documents (
  id SERIAL PRIMARY KEY,
  protocol_id integer REFERENCES thesis_protocols(id) ON DELETE CASCADE NOT NULL,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  doc_name text NOT NULL,
  file_path text,
  version integer DEFAULT 1,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS thesis_followups (
  id SERIAL PRIMARY KEY,
  protocol_id integer REFERENCES thesis_protocols(id) ON DELETE CASCADE NOT NULL,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  patient_id integer REFERENCES thesis_patients(id) ON DELETE CASCADE NOT NULL,
  followup_date date NOT NULL,
  followup_type text DEFAULT 'routine',
  findings text DEFAULT '',
  next_followup date,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS thesis_stats (
  id SERIAL PRIMARY KEY,
  protocol_id integer REFERENCES thesis_protocols(id) ON DELETE CASCADE NOT NULL,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  total_patients integer DEFAULT 0,
  active_patients integer DEFAULT 0,
  completed_patients integer DEFAULT 0,
  total_followups integer DEFAULT 0,
  documents_count integer DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

-- ===================================================================
-- DEADLINES & PROJECT TRACKING
-- ===================================================================

CREATE TABLE IF NOT EXISTS deadlines (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  project text DEFAULT '',
  due_date date NOT NULL,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  completed_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'active',
  progress integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- ===================================================================
-- FOLLOWUPS & FOLLOW-THROUGH
-- ===================================================================

CREATE TABLE IF NOT EXISTS followups (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  related_to text NOT NULL,
  related_id integer,
  task_title text NOT NULL,
  deadline date NOT NULL,
  status text DEFAULT 'pending',
  priority text DEFAULT 'medium',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ===================================================================
-- DASHBOARD & SNAPSHOTS
-- ===================================================================

CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  completed_tasks integer DEFAULT 0,
  points_earned integer DEFAULT 0,
  streak_days integer DEFAULT 0,
  mood_average numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ===================================================================
-- STUDY GROUPS & COLLABORATIVE LEARNING
-- ===================================================================

CREATE TABLE IF NOT EXISTS study_groups (
  id SERIAL PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  created_by integer REFERENCES user_profiles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_group_members (
  id SERIAL PRIMARY KEY,
  study_group_id integer REFERENCES study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(study_group_id, user_id)
);

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);
CREATE INDEX IF NOT EXISTS idx_personal_goals_user_id ON personal_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_time ON reminders(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_thesis_protocols_user_id ON thesis_protocols(user_id);
CREATE INDEX IF NOT EXISTS idx_thesis_patients_protocol_id ON thesis_patients(protocol_id);
CREATE INDEX IF NOT EXISTS idx_thesis_deadlines_protocol_id ON thesis_deadlines(protocol_id);
CREATE INDEX IF NOT EXISTS idx_thesis_deadlines_deadline ON thesis_deadlines(deadline);
CREATE INDEX IF NOT EXISTS idx_thesis_documents_protocol_id ON thesis_documents(protocol_id);
CREATE INDEX IF NOT EXISTS idx_thesis_followups_patient_id ON thesis_followups(patient_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_user_id ON deadlines(user_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_due_date ON deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_followups_user_id ON followups(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_user_date ON dashboard_snapshots(user_id, date);
CREATE INDEX IF NOT EXISTS idx_study_groups_is_active ON study_groups(is_active);

COMMIT;
