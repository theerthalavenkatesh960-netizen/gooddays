-- Create thesis_protocols table
BEGIN;

CREATE TABLE IF NOT EXISTS thesis_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
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
ALTER TABLE thesis_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own thesis protocols"
  ON thesis_protocols FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own thesis protocols"
  ON thesis_protocols FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own thesis protocols"
  ON thesis_protocols FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
