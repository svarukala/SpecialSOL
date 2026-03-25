CREATE TABLE questions_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade integer NOT NULL,
  subject text NOT NULL,
  topic text NOT NULL,
  subtopic text NOT NULL,
  sol_standard text NOT NULL,
  difficulty integer NOT NULL CHECK (difficulty IN (1, 2, 3)),
  question_text text NOT NULL,
  simplified_text text NOT NULL,
  answer_type text NOT NULL DEFAULT 'multiple_choice'
    CHECK (answer_type IN (
      'multiple_choice', 'true_false', 'multiple_select',
      'short_answer', 'ordering', 'matching', 'fill_in_blank'
    )),
  choices jsonb NOT NULL,
  hint_1 text NOT NULL,
  hint_2 text NOT NULL,
  hint_3 text NOT NULL,
  calculator_allowed boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'ai_generated'
    CHECK (source IN ('doe_released', 'ai_generated')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  generated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES parents(id)
);

ALTER TABLE questions_pending
  ADD CONSTRAINT review_columns_consistent
    CHECK (
      (reviewed_at IS NULL AND reviewed_by IS NULL) OR
      (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
    );

ALTER TABLE questions_pending ENABLE ROW LEVEL SECURITY;

-- Admin-only access via the is_admin column on parents
CREATE POLICY "admin_only" ON questions_pending
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM parents WHERE id = auth.uid() AND is_admin = true
    )
  );
