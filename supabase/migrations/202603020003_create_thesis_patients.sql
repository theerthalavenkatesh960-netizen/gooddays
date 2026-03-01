-- Create thesis_patients table (single canonical patients table)
BEGIN;

CREATE TABLE IF NOT EXISTS thesis_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  patient_code text,
  patient_id text,
  study_number text,
  group_name text,
  study_group_id uuid REFERENCES study_groups(id),
  protocol_id uuid REFERENCES thesis_protocols(id),
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

COMMIT;
