CREATE TABLE child_comparison_scores (
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('test', 'compete')),
  best_score int NOT NULL DEFAULT 0,
  best_total int NOT NULL DEFAULT 0,
  last_played timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (child_id, mode)
);

ALTER TABLE child_comparison_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comparison_scores_own" ON child_comparison_scores FOR ALL USING (
  EXISTS (SELECT 1 FROM children WHERE id = child_comparison_scores.child_id AND parent_id = auth.uid())
);
