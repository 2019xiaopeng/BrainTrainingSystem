import * as schema from "./schema/index.js";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

export const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });

let ensured: Promise<void> | null = null;

export const ensureSchemaReady = async () => {
  if (!ensured) {
    ensured = (async () => {
      await client`
        ALTER TABLE "user"
          ADD COLUMN IF NOT EXISTS "owned_items" jsonb NOT NULL DEFAULT '[]'::jsonb
      `;
      await client`
        ALTER TABLE "user"
          ADD COLUMN IF NOT EXISTS "inventory" jsonb NOT NULL DEFAULT '{}'::jsonb
      `;

      await client`
        ALTER TABLE "user"
          ADD COLUMN IF NOT EXISTS "banned_until" timestamp
      `;

      await client`
        ALTER TABLE "user"
          ADD COLUMN IF NOT EXISTS "banned_reason" text
      `;

      await client`
        CREATE TABLE IF NOT EXISTS "feature_flags" (
          "key" text PRIMARY KEY,
          "enabled" boolean NOT NULL DEFAULT false,
          "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
          "updated_at" timestamp DEFAULT now()
        )
      `;

      await client`
        CREATE TABLE IF NOT EXISTS "leaderboard_snapshots" (
          "kind" text PRIMARY KEY,
          "computed_at" timestamp NOT NULL DEFAULT now(),
          "payload" jsonb NOT NULL DEFAULT '{}'::jsonb
        )
      `;

      await client`
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
        )
      `;

      await client`
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
      `;

      await client`
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
      `;

      await client`CREATE INDEX IF NOT EXISTS "idx_user_brain_coins_desc" ON "user" ("brain_coins" DESC)`;
      await client`CREATE INDEX IF NOT EXISTS "idx_user_brain_level_xp_desc" ON "user" ("brain_level" DESC, "xp" DESC)`;
      await client`CREATE INDEX IF NOT EXISTS "idx_admin_audit_logs_created_at_desc" ON "admin_audit_logs" ("created_at" DESC)`;
      await client`CREATE INDEX IF NOT EXISTS "idx_admin_audit_logs_admin_user_id" ON "admin_audit_logs" ("admin_user_id")`;
      await client`CREATE INDEX IF NOT EXISTS "idx_admin_audit_logs_target_user_id" ON "admin_audit_logs" ("target_user_id")`;

      await client`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type') THEN
            CREATE TYPE "product_type" AS ENUM ('consumable', 'subscription', 'permanent');
          END IF;
        END$$;
      `;

      await client`
        CREATE TABLE IF NOT EXISTS "products" (
          "id" text PRIMARY KEY,
          "type" "product_type" NOT NULL,
          "price_cny" integer NOT NULL DEFAULT 0,
          "price_usd" integer NOT NULL DEFAULT 0,
          "price_coins" integer NOT NULL DEFAULT 0,
          "rewards" jsonb NOT NULL DEFAULT '{}'::jsonb,
          "is_active" integer DEFAULT 1
        )
      `;

      await client`
        ALTER TABLE "products"
          ADD COLUMN IF NOT EXISTS "price_coins" integer NOT NULL DEFAULT 0
      `;

      await client`
        INSERT INTO "products" ("id", "type", "price_cny", "price_usd", "price_coins", "rewards", "is_active")
        VALUES
          ('energy_1', 'consumable', 0, 0, 100, '{"energy":1}'::jsonb, 1),
          ('energy_5', 'consumable', 0, 0, 450, '{"energy":5}'::jsonb, 1),
          ('streak_saver', 'consumable', 0, 0, 500, '{"inventory":{"streak_saver":1}}'::jsonb, 1),
          ('premium_report', 'permanent', 0, 0, 1000, '{"ownedItem":"premium_report"}'::jsonb, 1),
          ('rename_card', 'consumable', 0, 0, 1000, '{"inventory":{"rename_card":1}}'::jsonb, 1)
        ON CONFLICT ("id") DO UPDATE SET
          "type" = EXCLUDED."type",
          "price_coins" = EXCLUDED."price_coins",
          "rewards" = EXCLUDED."rewards",
          "is_active" = EXCLUDED."is_active"
      `;
    })();
  }
  return ensured;
};
