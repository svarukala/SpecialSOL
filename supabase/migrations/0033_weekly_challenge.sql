-- supabase/migrations/0033_weekly_challenge.sql

CREATE TABLE weekly_puzzles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band text NOT NULL CHECK (band IN ('elementary', 'middle')),
  puzzle_type text NOT NULL CHECK (puzzle_type IN ('mystery_code', 'soldle')),
  week_start_date date,
  title text NOT NULL,
  content jsonb NOT NULL,
  solution jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  generated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES parents(id),
  CONSTRAINT review_columns_consistent CHECK (
    (reviewed_at IS NULL AND reviewed_by IS NULL) OR
    (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
  )
);

CREATE UNIQUE INDEX idx_weekly_puzzles_band_week
  ON weekly_puzzles(band, week_start_date) WHERE week_start_date IS NOT NULL;

ALTER TABLE weekly_puzzles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_puzzles_admin_write" ON weekly_puzzles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM parents WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "weekly_puzzles_approved_read" ON weekly_puzzles
  FOR SELECT USING (status = 'approved');


CREATE TABLE weekly_puzzle_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  puzzle_id uuid NOT NULL REFERENCES weekly_puzzles(id) ON DELETE CASCADE,
  band text NOT NULL CHECK (band IN ('elementary', 'middle')),
  solved_at timestamptz,
  attempt_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(child_id, puzzle_id)
);

ALTER TABLE weekly_puzzle_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_puzzle_attempts_own" ON weekly_puzzle_attempts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM children WHERE id = weekly_puzzle_attempts.child_id AND parent_id = auth.uid())
  );


ALTER TABLE children
  ADD COLUMN IF NOT EXISTS current_streak_elementary int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak_elementary    int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_solved_week_elementary date,
  ADD COLUMN IF NOT EXISTS current_streak_middle      int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak_middle         int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_solved_week_middle    date;

CREATE INDEX idx_weekly_puzzle_attempts_child ON weekly_puzzle_attempts(child_id);
