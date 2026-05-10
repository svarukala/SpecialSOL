CREATE TABLE child_money_scores (
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('identify', 'count', 'change')),
  best_score int NOT NULL DEFAULT 0,
  rounds_played int NOT NULL DEFAULT 0,
  last_played timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (child_id, mode)
);

ALTER TABLE child_money_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "money_scores_own" ON child_money_scores FOR ALL USING (
  EXISTS (SELECT 1 FROM children WHERE id = child_money_scores.child_id AND parent_id = auth.uid())
);
