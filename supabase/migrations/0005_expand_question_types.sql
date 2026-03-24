-- Expand answer_type to support all VA SOL question varieties
ALTER TABLE questions DROP CONSTRAINT questions_answer_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_answer_type_check
  CHECK (answer_type IN (
    'multiple_choice',
    'true_false',
    'multiple_select',
    'short_answer',
    'ordering',
    'matching',
    'fill_in_blank'
  ));
