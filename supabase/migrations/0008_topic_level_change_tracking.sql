ALTER TABLE child_topic_levels
  ADD COLUMN previous_level text
    CHECK (previous_level IN ('simplified', 'standard')),
  ADD COLUMN changed_at timestamptz,
  ADD CONSTRAINT topic_level_change_columns_consistent
    CHECK (
      (previous_level IS NULL AND changed_at IS NULL) OR
      (previous_level IS NOT NULL AND changed_at IS NOT NULL)
    );
