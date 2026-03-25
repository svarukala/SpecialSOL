ALTER TABLE child_topic_levels
  ADD CONSTRAINT no_phantom_level_changes
    CHECK (previous_level IS NULL OR previous_level <> language_level);
