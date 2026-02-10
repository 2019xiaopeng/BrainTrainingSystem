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
          ('premium_report', 'permanent', 0, 0, 1000, '{"ownedItem":"premium_report"}'::jsonb, 1)
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
