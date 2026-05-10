CREATE TABLE child_fraction_scores (
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('name', 'compare', 'equivalent')),
  best_score int NOT NULL DEFAULT 0,
  rounds_played int NOT NULL DEFAULT 0,
  last_played timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (child_id, level)
);

ALTER TABLE child_fraction_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fraction_scores_own" ON child_fraction_scores FOR ALL USING (
  EXISTS (SELECT 1 FROM children WHERE id = child_fraction_scores.child_id AND parent_id = auth.uid())
);
