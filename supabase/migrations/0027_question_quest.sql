CREATE TABLE wh_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wh_type text NOT NULL CHECK (wh_type IN ('what','where','who','when','why','how')),
  scenario text NOT NULL,
  question text NOT NULL,
  correct_answer text NOT NULL,
  distractors jsonb NOT NULL DEFAULT '[]',
  hint_1 text,
  hint_2 text,
  difficulty int NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  grade_min int NOT NULL DEFAULT 3,
  grade_max int NOT NULL DEFAULT 8,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE child_wh_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  wh_type text NOT NULL,
  questions_answered int NOT NULL DEFAULT 0,
  correct_count int NOT NULL DEFAULT 0,
  hint_count int NOT NULL DEFAULT 0,
  is_mastered boolean NOT NULL DEFAULT false,
  last_practiced timestamptz,
  UNIQUE(child_id, wh_type)
);

CREATE TABLE wh_session_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES wh_questions(id) ON DELETE CASCADE,
  answer_given text NOT NULL,
  is_correct boolean NOT NULL,
  hints_used int NOT NULL DEFAULT 0,
  answered_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE wh_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wh_questions_read" ON wh_questions FOR SELECT USING (is_active = true);
CREATE POLICY "wh_questions_admin" ON wh_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM parents WHERE id = auth.uid() AND is_admin = true)
);

ALTER TABLE child_wh_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wh_progress_own" ON child_wh_progress FOR ALL USING (
  EXISTS (SELECT 1 FROM children WHERE id = child_wh_progress.child_id AND parent_id = auth.uid())
);

ALTER TABLE wh_session_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wh_answers_own" ON wh_session_answers FOR ALL USING (
  EXISTS (SELECT 1 FROM children WHERE id = wh_session_answers.child_id AND parent_id = auth.uid())
);
