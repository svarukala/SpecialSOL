CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  grade int NOT NULL CHECK (grade BETWEEN 3 AND 8),
  topic text NOT NULL,
  content text NOT NULL,
  word_count int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE story_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  reflection text,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(child_id, story_id)
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stories_public_read" ON stories FOR SELECT USING (is_published = true);
CREATE POLICY "stories_admin_all" ON stories FOR ALL USING (
  EXISTS (SELECT 1 FROM parents WHERE id = auth.uid() AND is_admin = true)
);

ALTER TABLE story_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "story_reads_own" ON story_reads FOR ALL USING (
  EXISTS (SELECT 1 FROM children WHERE id = story_reads.child_id AND parent_id = auth.uid())
);
