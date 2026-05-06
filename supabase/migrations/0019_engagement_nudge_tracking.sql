-- Track when admin last sent a nudge email to a parent, to prevent re-spam
ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS last_nudge_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nudge_count INTEGER NOT NULL DEFAULT 0;
