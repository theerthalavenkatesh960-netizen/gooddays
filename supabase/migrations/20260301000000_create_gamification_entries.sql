/*
  # Create Gamification Entries Table

  Simple log of user activities and points awarded.  Mirrors the
  `GamificationEntry` model in the API project.
*/

CREATE TABLE IF NOT EXISTS gamification_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  points integer NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gamification_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gamification entries"
  ON gamification_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gamification entries"
  ON gamification_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own gamification entries"
  ON gamification_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
