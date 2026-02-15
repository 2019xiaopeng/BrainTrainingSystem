ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "banned_until" timestamp;

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "banned_reason" text;

CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_user_id" text,
  "target_user_id" text,
  "action" text NOT NULL,
  "before" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "after" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "ip" text,
  "user_agent" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_audit_logs_admin_user_id_fkey'
  ) THEN
    ALTER TABLE "admin_audit_logs"
      ADD CONSTRAINT "admin_audit_logs_admin_user_id_fkey"
      FOREIGN KEY ("admin_user_id") REFERENCES "user"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_audit_logs_target_user_id_fkey'
  ) THEN
    ALTER TABLE "admin_audit_logs"
      ADD CONSTRAINT "admin_audit_logs_target_user_id_fkey"
      FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_admin_audit_logs_created_at_desc" ON "admin_audit_logs" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_admin_audit_logs_admin_user_id" ON "admin_audit_logs" ("admin_user_id");
CREATE INDEX IF NOT EXISTS "idx_admin_audit_logs_target_user_id" ON "admin_audit_logs" ("target_user_id");
