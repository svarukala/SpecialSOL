-- Allow the same question text under the same standard when paired with different reading passages.
-- The old constraint incorrectly blocked valid questions like "What is the main idea?"
-- asked about different passages under the same SOL standard.
DROP INDEX idx_questions_unique_text;

CREATE UNIQUE INDEX idx_questions_unique_text
  ON questions(sol_standard, question_text, md5(COALESCE(reading_passage, '')));
