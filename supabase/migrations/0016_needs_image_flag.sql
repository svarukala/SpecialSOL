-- Flag questions that reference a visual/diagram that wasn't captured during
-- PDF extraction. These questions are unanswerable without the image and should
-- be excluded from practice sessions until the image is generated or the
-- question is removed.
ALTER TABLE questions ADD COLUMN needs_image boolean NOT NULL DEFAULT false;

-- Partial index: only index the flagged rows (small fraction of the table).
-- Used by the practice query's .eq('needs_image', false) filter.
CREATE INDEX idx_questions_needs_image ON questions(needs_image) WHERE needs_image = true;
