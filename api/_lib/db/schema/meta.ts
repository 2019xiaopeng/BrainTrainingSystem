import { boolean, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";

// --- Games Meta ---
// 游戏模式定义
export const games = pgTable("games", {
  id: text("id").primaryKey(), // e.g. 'numeric', 'spatial'
  nameKey: text("name_key").notNull(), // i18n key
  
  // 定义该模式可调节参数的结构与范围
  // e.g. { "n": {"min": 1, "max": 12}, "rounds": [10, 15, 20] }
  configSchema: jsonb("config_schema").notNull(),
  
  isActive: boolean("is_active").default(true),
});

// --- Level Configs ---
// 预设的难度梯度与解锁条件
export const levelConfigs = pgTable("level_configs", {
  id: integer("id").primaryKey(), // 自增或手动ID
  gameId: text("game_id").notNull().references(() => games.id),
  
  // 达到此等级所需的硬性条件 (XP, Rank)
  levelRequirements: jsonb("level_requirements"),
  
  // 具体的通关标准
  // e.g. { "accuracy": 90, "prev_level_id": 101 }
  unlockCriteria: jsonb("unlock_criteria"),
});
