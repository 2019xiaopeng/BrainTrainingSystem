import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth/user.js";

// --- Enums ---
export const productTypeEnum = pgEnum("product_type", ["consumable", "subscription", "permanent"]);
export const orderStatusEnum = pgEnum("order_status", ["created", "pending", "paid", "fulfilled", "failed", "refunded"]);
export const currencyEnum = pgEnum("currency", ["CNY", "USD"]);

// --- Products ---
export const products = pgTable("products", {
  id: text("id").primaryKey(), // e.g. 'energy_pack_1'
  type: productTypeEnum("type").notNull(),
  
  priceCny: integer("price_cny").notNull(), // 单位: 分
  priceUsd: integer("price_usd").notNull(), // 单位: Cent
  
  // 购买后的奖励/效果，由后端解析执行
  // e.g. { "energy": 5, "points": 100 }
  rewards: jsonb("rewards").notNull(),
  
  isActive: integer("is_active").default(1),
});

// --- Orders ---
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "set null" }),
  productId: text("product_id").references(() => products.id),
  
  amountPaid: integer("amount_paid").notNull(),
  currency: currencyEnum("currency").default("CNY").notNull(),
  
  status: orderStatusEnum("status").default("created").notNull(),
  
  // 支付网关返回的外部单号
  gatewayRefId: text("gateway_ref_id"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
});
