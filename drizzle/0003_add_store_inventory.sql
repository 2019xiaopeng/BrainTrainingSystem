ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "owned_items" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "inventory" jsonb NOT NULL DEFAULT '{}'::jsonb;

