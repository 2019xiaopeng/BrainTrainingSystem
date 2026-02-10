ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "xp" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "brain_level" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "energy_current" integer DEFAULT 5 NOT NULL,
  ADD COLUMN IF NOT EXISTS "energy_last_updated" timestamp DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "unlimited_energy_until" timestamp,
  ADD COLUMN IF NOT EXISTS "brain_stats" jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "tutorial_status" jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "wechat_unionid" text,
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;

DO $$ BEGIN
  ALTER TABLE "user" ADD CONSTRAINT "user_wechat_unionid_unique" UNIQUE("wechat_unionid");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

