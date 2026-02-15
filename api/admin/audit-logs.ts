import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../_lib/db/index.js";
import { adminAuditLogs } from "../_lib/db/schema/index.js";
import { requireAdmin } from "../_lib/admin.js";
import type { RequestLike, ResponseLike } from "../_lib/http.js";

const getUrl = (req: RequestLike): string => {
  const raw = (req as unknown as { url?: unknown }).url;
  return typeof raw === "string" ? raw : "http://localhost/api/admin/audit-logs";
};

const parseDate = (v: string | null): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    await requireAdmin(req);
  } catch (e) {
    const code = (e as Error).message === "forbidden" ? 403 : 401;
    res.status(code).json({ error: code === 403 ? "forbidden" : "unauthorized" });
    return;
  }

  const url = new URL(getUrl(req), "http://localhost");
  const adminUserId = (url.searchParams.get("adminUserId") ?? "").trim();
  const targetUserId = (url.searchParams.get("targetUserId") ?? "").trim();
  const from = parseDate(url.searchParams.get("from"));
  const to = parseDate(url.searchParams.get("to"));
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? 50) || 50));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);

  const filters: Array<unknown> = [];
  if (adminUserId) filters.push(eq(adminAuditLogs.adminUserId, adminUserId));
  if (targetUserId) filters.push(eq(adminAuditLogs.targetUserId, targetUserId));
  if (from) filters.push(gte(adminAuditLogs.createdAt, from));
  if (to) filters.push(lte(adminAuditLogs.createdAt, to));

  const rows = await db
    .select({
      id: adminAuditLogs.id,
      adminUserId: adminAuditLogs.adminUserId,
      targetUserId: adminAuditLogs.targetUserId,
      action: adminAuditLogs.action,
      before: adminAuditLogs.before,
      after: adminAuditLogs.after,
      ip: adminAuditLogs.ip,
      userAgent: adminAuditLogs.userAgent,
      createdAt: adminAuditLogs.createdAt,
    })
    .from(adminAuditLogs)
    .where((filters.length ? and(...(filters as any)) : undefined) as any)
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  res.status(200).json({
    items: rows.map((r) => ({
      id: r.id,
      adminUserId: r.adminUserId ?? null,
      targetUserId: r.targetUserId ?? null,
      action: r.action,
      before: r.before ?? {},
      after: r.after ?? {},
      ip: r.ip ?? null,
      userAgent: r.userAgent ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    limit,
    offset,
    nextOffset: rows.length === limit ? offset + limit : null,
  });
}

