-- Create thesis_deadlines table
BEGIN;

CREATE TABLE IF NOT EXISTS thesis_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  date date NOT NULL,
  completed boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE thesis_deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own thesis deadlines"
  ON thesis_deadlines FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own thesis deadlines"
  ON thesis_deadlines FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMIT;
