-- Migration: create full thesis module tables (protocols, followups, documents, deadlines, study_groups)
BEGIN;

-- Protocols
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

-- Study groups
CREATE TABLE IF NOT EXISTS study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  target_size integer DEFAULT 0,
  current_size integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;

-- Followups
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

-- Documents
CREATE TABLE IF NOT EXISTS thesis_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  document_type text,
  file_path text,
  uploaded_at timestamptz DEFAULT now()
);
ALTER TABLE thesis_documents ENABLE ROW LEVEL SECURITY;

-- Deadlines
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

-- Extend existing thesis_patients table with clinical fields if not present
ALTER TABLE thesis_patients ADD COLUMN IF NOT EXISTS patient_code text;
ALTER TABLE thesis_patients ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE thesis_patients ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE thesis_patients ADD COLUMN IF NOT EXISTS date_added date DEFAULT now();
ALTER TABLE thesis_patients ADD COLUMN IF NOT EXISTS dropout boolean DEFAULT false;
ALTER TABLE thesis_patients ADD COLUMN IF NOT EXISTS followup_status text DEFAULT 'pending';
ALTER TABLE thesis_patients ADD COLUMN IF NOT EXISTS group_name text;
ALTER TABLE thesis_patients ADD COLUMN IF NOT EXISTS study_group_id uuid REFERENCES study_groups(id);
ALTER TABLE thesis_patients ADD COLUMN IF NOT EXISTS protocol_id uuid REFERENCES thesis_protocols(id);
ALTER TABLE thesis_patients ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

COMMIT;
