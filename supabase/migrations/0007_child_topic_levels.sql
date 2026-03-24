-- supabase/migrations/0007_child_topic_levels.sql
CREATE TABLE child_topic_levels (
  child_id       uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  subject        text NOT NULL,
  topic          text NOT NULL,
  language_level text NOT NULL DEFAULT 'simplified'
    CHECK (language_level IN ('simplified', 'standard')),
  sessions_at_level int NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (child_id, subject, topic)
);

ALTER TABLE child_topic_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "child_topic_levels_parent_rw" ON child_topic_levels
  FOR ALL
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));

-- updated_at is maintained by application code (no trigger).
-- Every upsert must include updated_at: new Date().toISOString()
