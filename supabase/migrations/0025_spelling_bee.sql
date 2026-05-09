CREATE TABLE spelling_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL,
  grade int NOT NULL CHECK (grade BETWEEN 3 AND 8),
  definition text NOT NULL,
  example_sentence text NOT NULL,
  origin_language text NOT NULL,
  etymology_note text,
  difficulty int NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE spelling_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  grade int NOT NULL,
  total_words int NOT NULL DEFAULT 0,
  correct_count int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE spelling_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES spelling_sessions(id) ON DELETE CASCADE,
  word_id uuid NOT NULL REFERENCES spelling_words(id) ON DELETE CASCADE,
  answer_given text NOT NULL,
  is_correct boolean NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE spelling_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spelling_words_read" ON spelling_words FOR SELECT USING (is_active = true);
CREATE POLICY "spelling_words_admin" ON spelling_words FOR ALL USING (
  EXISTS (SELECT 1 FROM parents WHERE id = auth.uid() AND is_admin = true)
);

ALTER TABLE spelling_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spelling_sessions_own" ON spelling_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM children WHERE id = spelling_sessions.child_id AND parent_id = auth.uid())
);

ALTER TABLE spelling_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spelling_answers_own" ON spelling_answers FOR ALL USING (
  EXISTS (
    SELECT 1 FROM spelling_sessions ss
    JOIN children c ON c.id = ss.child_id
    WHERE ss.id = spelling_answers.session_id AND c.parent_id = auth.uid()
  )
);
