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
    })();
  }
  return ensured;
};
