-- Add columns and status value needed for pause/resume session flow.
-- These were applied directly to prod previously; this migration captures them
-- so a fresh deploy works correctly.

ALTER TABLE practice_sessions
  ADD COLUMN IF NOT EXISTS question_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS current_index int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz;

-- Extend the status check constraint to include 'paused'
ALTER TABLE practice_sessions DROP CONSTRAINT IF EXISTS practice_sessions_status_check;
ALTER TABLE practice_sessions
  ADD CONSTRAINT practice_sessions_status_check
  CHECK (status IN ('in_progress', 'paused', 'completed', 'abandoned'));
