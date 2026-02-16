import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth/user.js";

export const campaignEpisodes = pgTable("campaign_episodes", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  storyText: text("story_text").notNull(),
  order: integer("order").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const campaignLevels = pgTable("campaign_levels", {
  id: integer("id").primaryKey(),
  episodeId: integer("episode_id").notNull().references(() => campaignEpisodes.id, { onDelete: "cascade" }),
  orderInEpisode: integer("order_in_episode").notNull(),
  title: text("title").notNull(),
  gameMode: text("game_mode").notNull(),
  config: jsonb("config").notNull(),
  passRule: jsonb("pass_rule").default({}).notNull(),
  boss: boolean("boss").default(false).notNull(),
  mapPosition: jsonb("map_position").default({}).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const userCampaignState = pgTable("user_campaign_state", {
  userId: text("user_id").notNull().primaryKey().references(() => user.id, { onDelete: "cascade" }),
  currentEpisodeId: integer("current_episode_id").notNull(),
  currentLevelId: integer("current_level_id").notNull(),
  viewedEpisodeStoryIds: integer("viewed_episode_story_ids").array(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const userCampaignLevelResults = pgTable(
  "user_campaign_level_results",
  {
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    levelId: integer("level_id").notNull().references(() => campaignLevels.id, { onDelete: "cascade" }),
    bestStars: integer("best_stars").default(0).notNull(),
    bestAccuracy: integer("best_accuracy").default(0).notNull(),
    bestScore: integer("best_score"),
    clearedAt: timestamp("cleared_at"),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.levelId] }),
  })
);

