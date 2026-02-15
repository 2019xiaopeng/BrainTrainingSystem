import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { adminAuditLogs, user } from "./db/schema/index.js";
import { requireSessionUser } from "./session.js";
import type { RequestLike } from "./http.js";

export const getHeader = (req: RequestLike, name: string): string | null => {
  const viaGet = typeof req.headers?.get === "function" ? req.headers.get(name) : null;
  if (typeof viaGet === "string") return viaGet;
  const key = Object.keys(req.headers ?? {}).find((k) => k.toLowerCase() === name.toLowerCase());
  const raw = key ? (req.headers as Record<string, unknown>)[key] : null;
  return typeof raw === "string" ? raw : null;
};

export const parseJsonBody = (req: RequestLike): unknown => {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return null;
};

export type AdminViewer = {
  id: string;
  email: string;
  role: string;
};

export const requireAdmin = async (req: RequestLike): Promise<AdminViewer> => {
  const sessionUser = await requireSessionUser(req);
  const rows = await db
    .select({ id: user.id, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, sessionUser.id))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error("unauthorized");
  if (row.role !== "admin") throw new Error("forbidden");
  return { id: row.id, email: row.email, role: row.role };
};

export const getBanStatus = async (userId: string): Promise<{ banned: boolean; bannedUntil: Date | null }> => {
  const rows = await db.select({ bannedUntil: user.bannedUntil }).from(user).where(eq(user.id, userId)).limit(1);
  const until = rows[0]?.bannedUntil ?? null;
  if (!until) return { banned: false, bannedUntil: null };
  return { banned: until.getTime() > Date.now(), bannedUntil: until };
};

export const writeAdminAuditLog = async (args: {
  adminUserId: string;
  targetUserId?: string | null;
  action: string;
  before: unknown;
  after: unknown;
  req: RequestLike;
}) => {
  const ip = getHeader(args.req, "x-forwarded-for") ?? getHeader(args.req, "x-real-ip") ?? null;
  const ua = getHeader(args.req, "user-agent") ?? null;
  await db.insert(adminAuditLogs).values({
    adminUserId: args.adminUserId,
    targetUserId: args.targetUserId ?? null,
    action: args.action,
    before: (args.before && typeof args.before === "object" ? args.before : {}) as Record<string, unknown>,
    after: (args.after && typeof args.after === "object" ? args.after : {}) as Record<string, unknown>,
    ip,
    userAgent: ua,
  });
};

