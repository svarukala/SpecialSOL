-- Allow parents to read feedback submitted by their own children
CREATE POLICY "parents can read children feedback"
  ON feedback FOR SELECT
  USING (
    submitted_by_id IN (
      SELECT id FROM children WHERE parent_id = auth.uid()
    )
  );
