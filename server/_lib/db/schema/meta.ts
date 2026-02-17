import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// NOTE: `games` and `level_configs` tables have been superseded by
// `campaign_episodes` + `campaign_levels` (see campaign.ts).
// Migration 0008 drops them from the database.

export const featureFlags = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").default(false).notNull(),
  payload: jsonb("payload").default({}).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const leaderboardSnapshots = pgTable("leaderboard_snapshots", {
  kind: text("kind").primaryKey(),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
  payload: jsonb("payload").default({}).notNull(),
});
