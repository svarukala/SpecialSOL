CREATE TABLE child_clock_scores (
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  best_score int NOT NULL DEFAULT 0,
  rounds_played int NOT NULL DEFAULT 0,
  last_played timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (child_id, difficulty)
);

ALTER TABLE child_clock_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clock_scores_own" ON child_clock_scores FOR ALL USING (
  EXISTS (SELECT 1 FROM children WHERE id = child_clock_scores.child_id AND parent_id = auth.uid())
);
