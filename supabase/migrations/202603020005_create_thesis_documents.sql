-- Create thesis_documents table
BEGIN;

CREATE TABLE IF NOT EXISTS thesis_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  document_type text,
  file_path text,
  uploaded_at timestamptz DEFAULT now()
);
ALTER TABLE thesis_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own thesis documents"
  ON thesis_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own thesis documents"
  ON thesis_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMIT;
