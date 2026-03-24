-- Change answer_given from text to jsonb so complex answer types
-- (arrays for multiple_select/ordering, objects for matching/fill_in_blank)
-- can be stored natively. Existing text values become JSON strings.
ALTER TABLE session_answers
  ALTER COLUMN answer_given TYPE jsonb
  USING to_jsonb(answer_given);
