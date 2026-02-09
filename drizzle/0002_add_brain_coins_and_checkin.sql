ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "brain_coins" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "check_in_last_date" date,
  ADD COLUMN IF NOT EXISTS "check_in_streak" integer DEFAULT 0 NOT NULL;

