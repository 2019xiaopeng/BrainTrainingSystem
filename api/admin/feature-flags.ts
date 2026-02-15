import { eq } from "drizzle-orm";
import { db } from "../_lib/db/index.js";
import { adminAuditLogs, featureFlags } from "../_lib/db/schema/index.js";
import { getHeader, parseJsonBody, requireAdmin } from "../_lib/admin.js";
import { isRecord } from "../_lib/http.js";
import type { RequestLike, ResponseLike } from "../_lib/http.js";

export default async function handler(req: RequestLike, res: ResponseLike) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (e) {
    const code = (e as Error).message === "forbidden" ? 403 : 401;
    res.status(code).json({ error: code === 403 ? "forbidden" : "unauthorized" });
    return;
  }

  if (req.method === "GET") {
    const rows = await db
      .select({ key: featureFlags.key, enabled: featureFlags.enabled, payload: featureFlags.payload, updatedAt: featureFlags.updatedAt })
      .from(featureFlags);
    res.status(200).json({
      items: rows.map((r) => ({
        key: r.key,
        enabled: Boolean(r.enabled),
        payload: r.payload ?? {},
        updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
      })),
    });
    return;
  }

  if (req.method !== "PATCH") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const body = parseJsonBody(req);
  if (!isRecord(body)) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const key = String(body.key ?? "").trim();
  const enabledRaw = body.enabled;
  const enabled = typeof enabledRaw === "boolean" ? enabledRaw : null;
  const payload = body.payload;

  if (!key) {
    res.status(400).json({ error: "invalid_key" });
    return;
  }
  if (enabled === null) {
    res.status(400).json({ error: "invalid_enabled" });
    return;
  }
  if (payload !== undefined && (payload === null || typeof payload !== "object" || Array.isArray(payload))) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  const ip = getHeader(req, "x-forwarded-for") ?? getHeader(req, "x-real-ip") ?? null;
  const ua = getHeader(req, "user-agent") ?? null;

  try {
    const result = await db.transaction(async (tx) => {
      const beforeRows = await tx
        .select({ key: featureFlags.key, enabled: featureFlags.enabled, payload: featureFlags.payload })
        .from(featureFlags)
        .where(eq(featureFlags.key, key))
        .limit(1);
      const before = beforeRows[0] ?? null;

      await tx
        .insert(featureFlags)
        .values({ key, enabled, payload: (payload ?? {}) as Record<string, unknown> })
        .onConflictDoUpdate({
          target: featureFlags.key,
          set: { enabled, payload: (payload ?? before?.payload ?? {}) as Record<string, unknown> },
        });

      const afterRows = await tx
        .select({ key: featureFlags.key, enabled: featureFlags.enabled, payload: featureFlags.payload })
        .from(featureFlags)
        .where(eq(featureFlags.key, key))
        .limit(1);
      const after = afterRows[0] ?? { key, enabled, payload: payload ?? {} };

      await tx.insert(adminAuditLogs).values({
        adminUserId: admin.id,
        targetUserId: null,
        action: "admin.feature_flags.update",
        before: (before ?? {}) as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
        ip,
        userAgent: ua,
      });

      return after;
    });

    res.status(200).json({ ok: true, item: { key: result.key, enabled: Boolean(result.enabled), payload: result.payload ?? {} } });
  } catch {
    res.status(500).json({ error: "server_error" });
  }
}

