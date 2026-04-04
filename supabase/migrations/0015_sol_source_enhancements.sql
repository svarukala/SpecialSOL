-- Track which released test a question came from
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS source_year  int,
  ADD COLUMN IF NOT EXISTS source_test  text,
  ADD COLUMN IF NOT EXISTS reading_passage text,
  ADD COLUMN IF NOT EXISTS standards_rewritten boolean NOT NULL DEFAULT false;

ALTER TABLE questions_pending
  ADD COLUMN IF NOT EXISTS source_year  int,
  ADD COLUMN IF NOT EXISTS source_test  text,
  ADD COLUMN IF NOT EXISTS reading_passage text,
  ADD COLUMN IF NOT EXISTS standards_rewritten boolean NOT NULL DEFAULT false;

-- Index for filtering by source in the questions API
CREATE INDEX IF NOT EXISTS questions_source_idx ON questions (source);
