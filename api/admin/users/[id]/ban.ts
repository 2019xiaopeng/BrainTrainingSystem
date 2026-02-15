import { eq } from "drizzle-orm";
import { db } from "../../../_lib/db/index.js";
import { adminAuditLogs, user } from "../../../_lib/db/schema/index.js";
import { getHeader, parseJsonBody, requireAdmin } from "../../../_lib/admin.js";
import { isRecord } from "../../../_lib/http.js";
import type { RequestLike, ResponseLike } from "../../../_lib/http.js";

const getUrl = (req: RequestLike): string => {
  const raw = (req as unknown as { url?: unknown }).url;
  return typeof raw === "string" ? raw : "http://localhost/api/admin/users/unknown/ban";
};

const getUserIdParam = (req: RequestLike): string => {
  const q = (req as unknown as { query?: Record<string, unknown> }).query;
  const viaQuery = q ? (q["id"] ?? q["userId"] ?? q["uid"]) : null;
  if (typeof viaQuery === "string" && viaQuery.length > 0) return viaQuery;
  const url = new URL(getUrl(req), "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 2] ?? "";
};

const parseDate = (v: unknown): Date | null => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (e) {
    const code = (e as Error).message === "forbidden" ? 403 : 401;
    res.status(code).json({ error: code === 403 ? "forbidden" : "unauthorized" });
    return;
  }

  const id = getUserIdParam(req);
  if (!id) {
    res.status(400).json({ error: "invalid_user_id" });
    return;
  }

  const body = parseJsonBody(req);
  const reason = isRecord(body) && typeof body.reason === "string" ? body.reason : null;
  const untilRaw = isRecord(body) ? body.bannedUntil : null;
  const until = parseDate(untilRaw) ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const ip = getHeader(req, "x-forwarded-for") ?? getHeader(req, "x-real-ip") ?? null;
  const ua = getHeader(req, "user-agent") ?? null;

  const result = await db.transaction(async (tx) => {
    const beforeRows = await tx
      .select({
        id: user.id,
        bannedUntil: user.bannedUntil,
        bannedReason: user.bannedReason,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    const before = beforeRows[0];
    if (!before) return { error: "user_not_found" as const };

    await tx.update(user).set({ bannedUntil: until, bannedReason: reason }).where(eq(user.id, id));

    const afterRows = await tx
      .select({
        id: user.id,
        bannedUntil: user.bannedUntil,
        bannedReason: user.bannedReason,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    const after = afterRows[0] ?? before;

    await tx.insert(adminAuditLogs).values({
      adminUserId: admin.id,
      targetUserId: id,
      action: "admin.user.ban",
      before: before as unknown as Record<string, unknown>,
      after: after as unknown as Record<string, unknown>,
      ip,
      userAgent: ua,
    });

    return { ok: true as const, bannedUntil: after.bannedUntil };
  });

  if ("error" in result) {
    res.status(404).json({ error: "user_not_found" });
    return;
  }

  res.status(200).json({ ok: true, bannedUntil: result.bannedUntil ? result.bannedUntil.toISOString() : null });
}

