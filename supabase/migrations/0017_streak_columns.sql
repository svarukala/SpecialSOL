-- Add streak tracking columns to children table.
-- current_streak: consecutive days practiced (resets on missed day)
-- best_streak: all-time highest streak
-- last_practice_date: date of most recent completed session
-- streak_start_date: date the current streak began
ALTER TABLE children
  ADD COLUMN IF NOT EXISTS current_streak    INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak       INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_practice_date DATE,
  ADD COLUMN IF NOT EXISTS streak_start_date  DATE;
