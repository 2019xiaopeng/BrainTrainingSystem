import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  role: text("role").default("member").notNull(),
  gender: boolean("gender").notNull(),
  
  // --- Game Business Fields ---
  xp: integer("xp").default(0).notNull(),
  brainLevel: integer("brain_level").default(1).notNull(),
  
  // Energy System
  energyCurrent: integer("energy_current").default(5).notNull(),
  energyLastUpdated: timestamp("energy_last_updated").defaultNow(),
  unlimitedEnergyUntil: timestamp("unlimited_energy_until"),

  // Stats & Progress
  brainStats: jsonb("brain_stats").default({}), // 存储六维雷达图数据
  tutorialStatus: jsonb("tutorial_status").default({}), // 记录已完成的新手引导

  // External Auth
  wechatUnionId: text("wechat_unionid").unique(),
  stripeCustomerId: text("stripe_customer_id"),

  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

export type UserType = typeof user.$inferSelect;

