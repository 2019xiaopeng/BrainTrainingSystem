import { boolean, date, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  role: text("role").default("user").notNull(),
  gender: boolean("gender").notNull(),
  
  // --- Game Business Fields ---
  xp: integer("xp").default(0).notNull(),
  brainLevel: integer("brain_level").default(1).notNull(),
  brainCoins: integer("brain_coins").default(0).notNull(),
  
  // Energy System
  energyCurrent: integer("energy_current").default(5).notNull(),
  energyLastUpdated: timestamp("energy_last_updated").defaultNow(),
  unlimitedEnergyUntil: timestamp("unlimited_energy_until"),

  // Check-in
  checkInLastDate: date("check_in_last_date"),
  checkInStreak: integer("check_in_streak").default(0).notNull(),

  // Stats & Progress
  brainStats: jsonb("brain_stats").default({}), // 存储六维雷达图数据
  tutorialStatus: jsonb("tutorial_status").default({}), // 记录已完成的新手引导

  // Store
  ownedItems: jsonb("owned_items").default([]).notNull(),
  inventory: jsonb("inventory").default({}).notNull(),

  // Admin & Governance
  bannedUntil: timestamp("banned_until"),
  bannedReason: text("banned_reason"),

  // External Auth
  wechatUnionId: text("wechat_unionid").unique(),
  stripeCustomerId: text("stripe_customer_id"),

  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

export type UserType = typeof user.$inferSelect;
