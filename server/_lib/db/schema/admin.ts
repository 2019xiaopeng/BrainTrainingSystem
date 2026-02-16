import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth/user.js";

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminUserId: text("admin_user_id").references(() => user.id, { onDelete: "set null" }),
  targetUserId: text("target_user_id").references(() => user.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  before: jsonb("before").default({}).notNull(),
  after: jsonb("after").default({}).notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
