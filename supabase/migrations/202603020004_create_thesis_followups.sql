-- Create thesis_followups table
BEGIN;

CREATE TABLE IF NOT EXISTS thesis_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES thesis_patients(id) ON DELETE CASCADE NOT NULL,
  visit_number integer,
  visit_date date,
  status text DEFAULT 'pending',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE thesis_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own thesis followups"
  ON thesis_followups FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM thesis_patients p WHERE p.id = patient_id AND p.user_id = auth.uid()));

CREATE POLICY "Users can insert own thesis followups"
  ON thesis_followups FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM thesis_patients p WHERE p.id = NEW.patient_id AND p.user_id = auth.uid()));

CREATE POLICY "Users can update own thesis followups"
  ON thesis_followups FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM thesis_patients p WHERE p.id = patient_id AND p.user_id = auth.uid()));

COMMIT;
