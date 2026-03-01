-- Create study_groups table
BEGIN;

CREATE TABLE IF NOT EXISTS study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  target_size integer DEFAULT 0,
  current_size integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study groups"
  ON study_groups FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study groups"
  ON study_groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study groups"
  ON study_groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
