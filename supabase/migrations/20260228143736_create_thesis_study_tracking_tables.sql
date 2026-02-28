/*
  # Create Thesis, Study, and Tracking Tables

  1. New Tables
    - `thesis_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, unique)
      - `total_sample_size` (integer, default 135)
      - `group_a_size` (integer, default 45)
      - `group_b_size` (integer, default 45)
      - `group_c_size` (integer, default 45)
    
    - `thesis_patients`
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `date` (date)
      - `group` (text)
      - `notes` (text)
      - `proforma_status` (text)
      - `created_at` (timestamp)
    
    - `study_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `date` (date)
      - `minutes` (integer)
      - `notes` (text)
      - `created_at` (timestamp)
    
    - `study_resources`
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `name` (text)
      - `created_at` (timestamp)
    
    - `study_chapters`
      - `id` (uuid, primary key)
      - `resource_id` (uuid)
      - `user_id` (uuid)
      - `name` (text)
      - `status` (text, default 'not_started')
      - `video_link` (text)
      - `created_at` (timestamp)
    
    - `daily_tracking`
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `date` (date, unique per user)
      - `sleep_hours` (numeric)
      - `workout_minutes` (integer)
      - `phone_minutes` (integer)
      - `sunlight` (boolean)
      - `mood` (integer, 1-5)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create thesis_settings table
CREATE TABLE IF NOT EXISTS thesis_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_sample_size integer DEFAULT 135,
  group_a_size integer DEFAULT 45,
  group_b_size integer DEFAULT 45,
  group_c_size integer DEFAULT 45,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE thesis_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own thesis settings"
  ON thesis_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own thesis settings"
  ON thesis_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own thesis settings"
  ON thesis_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create thesis_patients table
CREATE TABLE IF NOT EXISTS thesis_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  group_name text NOT NULL,
  notes text DEFAULT '',
  proforma_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE thesis_patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own thesis patients"
  ON thesis_patients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own thesis patients"
  ON thesis_patients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own thesis patients"
  ON thesis_patients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own thesis patients"
  ON thesis_patients FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create study_sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  minutes integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study sessions"
  ON study_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study sessions"
  ON study_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions"
  ON study_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create study_resources table
CREATE TABLE IF NOT EXISTS study_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE study_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study resources"
  ON study_resources FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study resources"
  ON study_resources FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study resources"
  ON study_resources FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own study resources"
  ON study_resources FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create study_chapters table
CREATE TABLE IF NOT EXISTS study_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid REFERENCES study_resources(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'not_started',
  video_link text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE study_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study chapters"
  ON study_chapters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study chapters"
  ON study_chapters FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study chapters"
  ON study_chapters FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own study chapters"
  ON study_chapters FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create daily_tracking table
CREATE TABLE IF NOT EXISTS daily_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  sleep_hours numeric DEFAULT 0,
  workout_minutes integer DEFAULT 0,
  phone_minutes integer DEFAULT 0,
  sunlight boolean DEFAULT false,
  mood integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily tracking"
  ON daily_tracking FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily tracking"
  ON daily_tracking FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily tracking"
  ON daily_tracking FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);