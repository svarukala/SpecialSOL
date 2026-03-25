CREATE OR REPLACE FUNCTION approve_pending_question(
  p_pending_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_question_id uuid;
  v_pending questions_pending%ROWTYPE;
BEGIN
  -- Admin auth guard: verify the calling user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM parents WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_pending
  FROM questions_pending WHERE id = p_pending_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_pending.status != 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  IF EXISTS (
    SELECT 1 FROM questions
    WHERE sol_standard = v_pending.sol_standard
      AND question_text = v_pending.question_text
  ) THEN
    RAISE EXCEPTION 'already_published';
  END IF;

  INSERT INTO questions (
    grade, subject, topic, subtopic, sol_standard, difficulty,
    question_text, simplified_text, answer_type, choices,
    hint_1, hint_2, hint_3, calculator_allowed, source
  ) VALUES (
    v_pending.grade, v_pending.subject, v_pending.topic, v_pending.subtopic,
    v_pending.sol_standard, v_pending.difficulty, v_pending.question_text,
    v_pending.simplified_text, v_pending.answer_type, v_pending.choices,
    v_pending.hint_1, v_pending.hint_2, v_pending.hint_3,
    v_pending.calculator_allowed, v_pending.source
  ) RETURNING id INTO v_question_id;

  UPDATE questions_pending SET
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  WHERE id = p_pending_id;

  RETURN v_question_id;
END;
$$;
