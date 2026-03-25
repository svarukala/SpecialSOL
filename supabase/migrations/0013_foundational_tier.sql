-- supabase/migrations/0013_foundational_tier.sql

-- Add tier to the live questions table
ALTER TABLE questions
  ADD COLUMN tier text NOT NULL DEFAULT 'standard'
    CHECK (tier IN ('foundational', 'standard'));

-- Add tier to the staging questions_pending table (created by QG-1 migration 0011)
ALTER TABLE questions_pending
  ADD COLUMN tier text NOT NULL DEFAULT 'standard'
    CHECK (tier IN ('foundational', 'standard'));

-- Extend language_level check on child_topic_levels to include 'foundational'
-- (auto-generated constraint name from migration 0007)
ALTER TABLE child_topic_levels
  DROP CONSTRAINT child_topic_levels_language_level_check;

ALTER TABLE child_topic_levels
  ADD CONSTRAINT child_topic_levels_language_level_check
    CHECK (language_level IN ('foundational', 'simplified', 'standard'));

-- Add promotion_ready flag (set by app after 3 sessions >= 80%; cleared after parent acts)
ALTER TABLE child_topic_levels
  ADD COLUMN promotion_ready boolean NOT NULL DEFAULT false;
