-- supabase/migrations/0034_child_badges.sql

CREATE TABLE child_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  badge_key text NOT NULL,
  badge_type text NOT NULL CHECK (badge_type IN ('puzzle', 'streak_milestone')),
  band text NOT NULL CHECK (band IN ('elementary', 'middle')),
  title text NOT NULL,
  emoji text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(child_id, badge_key)
);

ALTER TABLE child_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "child_badges_own" ON child_badges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM children WHERE id = child_badges.child_id AND parent_id = auth.uid())
  );

CREATE INDEX idx_child_badges_child ON child_badges(child_id);
