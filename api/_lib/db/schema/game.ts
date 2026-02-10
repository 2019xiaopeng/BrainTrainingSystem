import { integer, jsonb, pgTable, primaryKey, text, timestamp, uuid, date } from "drizzle-orm/pg-core";
import { user } from "./auth/user.js";

// --- Game Sessions (History) ---
// 存储每一局的游戏结果
export const gameSessions = pgTable("game_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  
  gameMode: text("game_mode").notNull(), // 'numeric', 'spatial', 'mouse', 'house'
  
  // 核心指标
  nLevel: integer("n_level"), // for N-Back
  score: integer("score").notNull(),
  accuracy: integer("accuracy").notNull(), // 0-100
  
  // 扩展参数 (用于存储不同模式的特定参数，如 grid_size, mice_count)
  configSnapshot: jsonb("config_snapshot").notNull(), 
  
  // 性能指标
  avgReactionTime: integer("avg_reaction_time"), // ms
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- User Unlocks (Skill Tree) ---
// 记录用户在各个游戏模式下的解锁进度
// 复合主键: userId + gameId
export const userUnlocks = pgTable("user_unlocks", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  gameId: text("game_id").notNull(), // 'numeric', 'spatial', etc.
  
  // 核心：解锁的前沿参数
  // 例如 Numeric: { "maxN": 3, "unlockedRounds": [10, 15] }
  // 例如 Spatial: { "maxGrid": 4, "maxN": 2 }
  unlockedParams: jsonb("unlocked_params").default({}).notNull(),
  
  // 如果未来有离散的关卡ID设计，可预留此字段
  completedLevelIds: integer("completed_level_ids").array(),
  
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.gameId] }),
}));

// --- Daily Activity (Heatmap) ---
// 聚合每日活跃数据，用于快速渲染热力图
export const dailyActivity = pgTable("daily_activity", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  
  date: date("date").notNull(), // YYYY-MM-DD
  
  totalXp: integer("total_xp").default(0).notNull(),
  sessionsCount: integer("sessions_count").default(0).notNull(),
  
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});
