CREATE TABLE IF NOT EXISTS "feature_flags" (
  "key" text PRIMARY KEY,
  "enabled" boolean NOT NULL DEFAULT false,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "leaderboard_snapshots" (
  "kind" text PRIMARY KEY,
  "computed_at" timestamp NOT NULL DEFAULT now(),
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS "idx_user_brain_coins_desc" ON "user" ("brain_coins" DESC);
CREATE INDEX IF NOT EXISTS "idx_user_brain_level_xp_desc" ON "user" ("brain_level" DESC, "xp" DESC);
