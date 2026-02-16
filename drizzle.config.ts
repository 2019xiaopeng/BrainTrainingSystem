import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/_lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: (process.env.DIRECT_URL || process.env.DATABASE_URL)!,
  },
  verbose: true,
  strict: false,
});
