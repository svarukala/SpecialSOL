-- Parents
CREATE TABLE parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parents_own_row" ON parents
  FOR ALL USING (id = auth.uid());

-- Children
CREATE TABLE children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar text NOT NULL DEFAULT '🌟',
  grade int NOT NULL CHECK (grade BETWEEN 3 AND 12),
  created_at timestamptz DEFAULT now(),
  accommodations jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "children_by_parent" ON children
  FOR ALL USING (parent_id = auth.uid());

-- Questions (public read)
CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade int NOT NULL CHECK (grade BETWEEN 3 AND 12),
  subject text NOT NULL,
  topic text NOT NULL,
  subtopic text,
  sol_standard text,
  difficulty int NOT NULL DEFAULT 1 CHECK (difficulty IN (1, 2, 3)),
  question_text text NOT NULL,
  simplified_text text,
  answer_type text NOT NULL CHECK (answer_type IN ('multiple_choice', 'true_false')),
  choices jsonb NOT NULL,
  hint_1 text,
  hint_2 text,
  hint_3 text,
  calculator_allowed bool NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'doe_released' CHECK (source IN ('doe_released', 'ai_generated')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_public_read" ON questions
  FOR SELECT USING (true);

-- Practice sessions
CREATE TABLE practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  grade int NOT NULL,
  subject text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('practice', 'test')),
  question_count int NOT NULL,
  score_percent int,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  accommodations_used jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_by_parent" ON practice_sessions
  FOR ALL USING (
    child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  );

-- Session answers
CREATE TABLE session_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id),
  answer_given text NOT NULL,
  is_correct bool NOT NULL,
  time_spent_seconds int NOT NULL DEFAULT 0,
  hints_used int NOT NULL DEFAULT 0 CHECK (hints_used BETWEEN 0 AND 3),
  tts_used bool NOT NULL DEFAULT false,
  repeated_question bool NOT NULL DEFAULT false,
  attempt_number int NOT NULL DEFAULT 1
);
ALTER TABLE session_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers_by_parent" ON session_answers
  FOR ALL USING (
    session_id IN (
      SELECT id FROM practice_sessions
      WHERE child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
    )
  );

-- Feedback
CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by_type text NOT NULL CHECK (submitted_by_type IN ('parent', 'child')),
  submitted_by_id uuid NOT NULL,
  session_id uuid REFERENCES practice_sessions(id) ON DELETE SET NULL,
  question_id uuid REFERENCES questions(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (
    category IN ('bug', 'question_error', 'suggestion', 'praise', 'other', 'child_confused', 'child_read_again')
  ),
  message text,
  voice_note_url text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_insert_all" ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "feedback_select_parent" ON feedback
  FOR SELECT USING (submitted_by_id = auth.uid());

-- Unique index for seed upsert idempotency
CREATE UNIQUE INDEX idx_questions_unique_text ON questions(sol_standard, question_text)
  WHERE sol_standard IS NOT NULL;

-- Performance indexes
CREATE INDEX idx_children_parent ON children(parent_id);
CREATE INDEX idx_sessions_child ON practice_sessions(child_id);
CREATE INDEX idx_sessions_status ON practice_sessions(status);
CREATE INDEX idx_answers_session ON session_answers(session_id);
CREATE INDEX idx_questions_grade_subject ON questions(grade, subject);

-- Storage bucket for voice note feedback (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-voice-notes', 'feedback-voice-notes', false)
ON CONFLICT (id) DO NOTHING;
