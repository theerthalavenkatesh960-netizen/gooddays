/*
  # Create Expenses and Self Care Tables

  1. New Tables
    - `expenses`
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `amount` (numeric)
      - `category` (text)
      - `note` (text)
      - `created_at` (timestamp)
    
    - `self_care_template`
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `category` (text - AM, PM, Hair)
      - `item` (text)
      - `order_index` (integer)
      - `created_at` (timestamp)
    
    - `self_care_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `date` (date)
      - `template_id` (uuid)
      - `completed` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  category text DEFAULT 'Other',
  note text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create self_care_template table
CREATE TABLE IF NOT EXISTS self_care_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  item text NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE self_care_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own self care template"
  ON self_care_template FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own self care template"
  ON self_care_template FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own self care template"
  ON self_care_template FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own self care template"
  ON self_care_template FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create self_care_logs table
CREATE TABLE IF NOT EXISTS self_care_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  template_id uuid REFERENCES self_care_template(id) ON DELETE CASCADE NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date, template_id)
);

ALTER TABLE self_care_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own self care logs"
  ON self_care_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own self care logs"
  ON self_care_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own self care logs"
  ON self_care_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own self care logs"
  ON self_care_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);