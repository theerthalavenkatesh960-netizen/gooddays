-- Combined "up" migration including all steps from the repository
-- Run this file once on a fresh database to create the entire schema.
-- Undo operations remain in undo_all.sql.

BEGIN;

-- core tables -------------------------------------------------------------
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
-- RLS disabled: using application-level auth

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
-- RLS disabled: using application-level auth

-- trigger to default due_date when not specified
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
-- RLS disabled: using application-level auth

CREATE TABLE IF NOT EXISTS daily_notes (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  note text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);
-- RLS disabled: using application-level auth

CREATE TABLE IF NOT EXISTS focus_sessions (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  task_name text NOT NULL,
  duration integer NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
-- RLS disabled: using application-level auth

-- Thesis module: settings, protocols, study groups, patients, followups, documents, deadlines
-- Settings
CREATE TABLE IF NOT EXISTS thesis_settings (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_sample_size integer DEFAULT 135,
  group_a_size integer DEFAULT 45,
  group_b_size integer DEFAULT 45,
  group_c_size integer DEFAULT 45,
  created_at timestamptz DEFAULT now()
);
-- RLS disabled: using application-level auth

-- Protocols
CREATE TABLE IF NOT EXISTS thesis_protocols (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text,
  guide_name text,
  department text,
  college text,
  study_type text,
  total_sample_size integer DEFAULT 0,
  start_date date,
  end_date date,
  protocol_approved boolean DEFAULT false,
  approval_date date,
  iec_number text,
  synopsis_submitted boolean DEFAULT false,
  synopsis_approved boolean DEFAULT false,
  ethics_submitted boolean DEFAULT false,
  ethics_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS disabled: using application-level auth

-- Study groups
CREATE TABLE IF NOT EXISTS study_groups (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  target_size integer DEFAULT 0,
  current_size integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
-- RLS disabled: using application-level auth

-- Canonical patients table (single source of truth)
CREATE TABLE IF NOT EXISTS thesis_patients (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  patient_code text,
  patient_id text,
  study_number text,
  group_name text,
  study_group_id integer REFERENCES study_groups(id),
  protocol_id integer REFERENCES thesis_protocols(id),
  recruitment_date date,
  date_added date DEFAULT now(),
  age integer,
  gender text,
  consent_taken boolean DEFAULT false,
  inclusion_criteria_met boolean DEFAULT false,
  exclusion_criteria_met boolean DEFAULT false,
  proforma_status text DEFAULT 'pending',
  followup_status text DEFAULT 'pending',
  dropout boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS disabled: using application-level auth

-- Followups
CREATE TABLE IF NOT EXISTS thesis_followups (
  id SERIAL PRIMARY KEY,
  patient_id integer REFERENCES thesis_patients(id) ON DELETE CASCADE NOT NULL,
  visit_number integer,
  visit_date date,
  status text DEFAULT 'pending',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS disabled: using application-level auth




-- Documents
CREATE TABLE IF NOT EXISTS thesis_documents (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  document_type text,
  file_path text,
  uploaded_at timestamptz DEFAULT now()
);
-- RLS disabled: using application-level auth

-- Deadlines
CREATE TABLE IF NOT EXISTS thesis_deadlines (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  date date NOT NULL,
  completed boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
-- RLS disabled: using application-level auth

CREATE TABLE IF NOT EXISTS study_sessions (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  minutes integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);
-- RLS disabled: using application-level auth

CREATE TABLE IF NOT EXISTS study_resources (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);
-- RLS disabled: using application-level auth

CREATE TABLE IF NOT EXISTS study_chapters (
  id SERIAL PRIMARY KEY,
  resource_id integer REFERENCES study_resources(id) ON DELETE CASCADE NOT NULL,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'not_started',
  video_link text,
  created_at timestamptz DEFAULT now()
);
-- RLS disabled: using application-level auth

CREATE TABLE IF NOT EXISTS daily_tracking (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  sleep_hours numeric DEFAULT 0,
  workout_minutes integer DEFAULT 0,
  phone_minutes integer DEFAULT 0,
  sunlight boolean DEFAULT false,
  mood integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);
-- RLS disabled: using application-level auth

-- expenses and self-care tables (from 20260228143741_create_expenses_selfcare_tables.sql)
-- these were originally added in a separate migration; include them here so
-- the combined schema file can be used to bootstrap a fresh database.

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  category text DEFAULT 'Other',
  note text DEFAULT '',
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- RLS disabled: using application-level auth

-- Create self_care_template table
CREATE TABLE IF NOT EXISTS self_care_template (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  item text NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS disabled: using application-level auth

-- Create self_care_logs table
CREATE TABLE IF NOT EXISTS self_care_logs (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  template_id integer REFERENCES self_care_template(id) ON DELETE CASCADE NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date, template_id)
);

-- RLS disabled: using application-level auth

-- gamification helpers
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
-- RLS disabled: using application-level auth

COMMIT;