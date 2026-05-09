ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS summer_learning_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS summer_learning_access boolean NOT NULL DEFAULT false;
