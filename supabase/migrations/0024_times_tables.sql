CREATE TABLE times_tables_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  multiplier int NOT NULL CHECK (multiplier BETWEEN 2 AND 12),
  attempts int NOT NULL DEFAULT 0,
  correct int NOT NULL DEFAULT 0,
  best_speed_ms int,
  last_practiced timestamptz,
  UNIQUE(child_id, multiplier)
);

CREATE TABLE times_tables_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  multiplier int NOT NULL,
  multiplicand int NOT NULL,
  answer_given int NOT NULL,
  is_correct boolean NOT NULL,
  response_time_ms int,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE times_tables_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "times_mastery_own" ON times_tables_mastery FOR ALL USING (
  EXISTS (SELECT 1 FROM children WHERE id = times_tables_mastery.child_id AND parent_id = auth.uid())
);

ALTER TABLE times_tables_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "times_attempts_own" ON times_tables_attempts FOR ALL USING (
  EXISTS (SELECT 1 FROM children WHERE id = times_tables_attempts.child_id AND parent_id = auth.uid())
);
