import { and, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { db } from "../../server/_lib/db/index.js";
import { adminAuditLogs, featureFlags, user } from "../../server/_lib/db/schema/index.js";
import { getHeader, parseJsonBody, requireAdmin } from "../../server/_lib/admin.js";
import { isRecord } from "../../server/_lib/http.js";
import type { RequestLike, ResponseLike } from "../../server/_lib/http.js";

const setNoStore = (res: ResponseLike) => {
  const r = res as unknown as { setHeader?: (name: string, value: string) => void };
  r.setHeader?.("Cache-Control", "no-store");
  r.setHeader?.("CDN-Cache-Control", "no-store");
  r.setHeader?.("Vercel-CDN-Cache-Control", "no-store");
  r.setHeader?.("Pragma", "no-cache");
  r.setHeader?.("Expires", "0");
};

const getUrl = (req: RequestLike): string => {
  const raw = (req as unknown as { url?: unknown }).url;
  return typeof raw === "string" ? raw : "http://localhost/api/admin";
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

const parseDateKey = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const m = v.match(/^\d{4}-\d{2}-\d{2}$/);
  return m ? v : null;
};

const toCsvCell = (v: unknown): string => {
  const str = typeof v === "string" ? v : JSON.stringify(v ?? "");
  const safe = str.replaceAll('"', '""');
  return `"${safe}"`;
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  setNoStore(res);

  try {
    return await handleAdmin(req, res);
  } catch (err) {
    console.error("[admin] unhandled error:", err);
    try { res.status(500).json({ error: "internal_server_error" }); } catch { /* already sent */ }
  }
}

async function handleAdmin(req: RequestLike, res: ResponseLike) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (e) {
    const msg = String((e as Error).message ?? "");
    if (msg.startsWith("forbidden:")) {
      const role = msg.slice("forbidden:".length) || "unknown";
      res.status(403).json({ error: "forbidden", role });
      return;
    }
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const url = new URL(getUrl(req), "http://localhost");
  const segments = url.pathname.split("/").filter(Boolean);
  const adminIndex = segments.findIndex((s) => s === "admin");
  const path = adminIndex >= 0 ? segments.slice(adminIndex + 1) : segments.slice(1);

  const ip = getHeader(req, "x-forwarded-for") ?? getHeader(req, "x-real-ip") ?? null;
  const ua = getHeader(req, "user-agent") ?? null;

  if (req.method === "GET" && path.length === 1 && path[0] === "me") {
    res.status(200).json({ userId: admin.id, email: admin.email, role: admin.role, isAdmin: true });
    return;
  }

  if (req.method === "GET" && path.length === 1 && path[0] === "users") {
    const query = (url.searchParams.get("query") ?? "").trim();
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") ?? 20) || 20));
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);

    const where =
      query.length > 0
        ? or(
            ilike(user.email, `%${query}%`),
            ilike(user.name, `%${query}%`),
            ilike(user.id, `%${query}%`),
            ilike(user.username, `%${query}%`)
          )
        : undefined;

    const rows = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        xp: user.xp,
        brainCoins: user.brainCoins,
        brainLevel: user.brainLevel,
        bannedUntil: user.bannedUntil,
        bannedReason: user.bannedReason,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(where as any)
      .orderBy(desc(user.updatedAt), desc(user.createdAt))
      .limit(limit)
      .offset(offset);

    res.status(200).json({
      items: rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        role: r.role,
        xp: r.xp ?? 0,
        brainCoins: r.brainCoins ?? 0,
        brainLevel: r.brainLevel ?? 1,
        bannedUntil: r.bannedUntil ? r.bannedUntil.toISOString() : null,
        bannedReason: r.bannedReason ?? null,
        createdAt: r.createdAt ? r.createdAt.toISOString() : null,
        updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
      })),
      limit,
      offset,
      nextOffset: rows.length === limit ? offset + limit : null,
    });
    return;
  }

  if (path.length >= 2 && path[0] === "users") {
    const userId = path[1] ?? "";
    if (!userId) {
      res.status(400).json({ error: "invalid_user_id" });
      return;
    }

    if (req.method === "GET" && path.length === 2) {
      const rows = await db
        .select({
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          role: user.role,
          xp: user.xp,
          brainCoins: user.brainCoins,
          brainLevel: user.brainLevel,
          energyCurrent: user.energyCurrent,
          energyLastUpdated: user.energyLastUpdated,
          unlimitedEnergyUntil: user.unlimitedEnergyUntil,
          checkInLastDate: user.checkInLastDate,
          checkInStreak: user.checkInStreak,
          brainStats: user.brainStats,
          ownedItems: user.ownedItems,
          inventory: user.inventory,
          bannedUntil: user.bannedUntil,
          bannedReason: user.bannedReason,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      const u = rows[0];
      if (!u) {
        res.status(404).json({ error: "user_not_found" });
        return;
      }

      res.status(200).json({
        id: u.id,
        email: u.email,
        name: u.name,
        username: u.username ?? null,
        role: u.role,
        xp: u.xp ?? 0,
        brainCoins: u.brainCoins ?? 0,
        brainLevel: u.brainLevel ?? 1,
        energyCurrent: u.energyCurrent ?? 0,
        energyLastUpdated: u.energyLastUpdated ? u.energyLastUpdated.toISOString() : null,
        unlimitedEnergyUntil: u.unlimitedEnergyUntil ? u.unlimitedEnergyUntil.toISOString() : null,
        checkInLastDate: u.checkInLastDate ? String(u.checkInLastDate) : null,
        checkInStreak: u.checkInStreak ?? 0,
        brainStats: u.brainStats ?? {},
        ownedItems: u.ownedItems ?? [],
        inventory: u.inventory ?? {},
        bannedUntil: u.bannedUntil ? u.bannedUntil.toISOString() : null,
        bannedReason: u.bannedReason ?? null,
        createdAt: u.createdAt ? u.createdAt.toISOString() : null,
        updatedAt: u.updatedAt ? u.updatedAt.toISOString() : null,
      });
      return;
    }

    if (req.method === "POST" && path.length === 3 && path[2] === "ban") {
      const body = parseJsonBody(req);
      const reason = isRecord(body) && typeof body.reason === "string" ? body.reason : null;
      const untilRaw = isRecord(body) ? body.bannedUntil : null;
      const until = parseDate(untilRaw) ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      const result = await db.transaction(async (tx) => {
        const beforeRows = await tx
          .select({ id: user.id, bannedUntil: user.bannedUntil, bannedReason: user.bannedReason })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1);
        const before = beforeRows[0];
        if (!before) return { error: "user_not_found" as const };

        await tx.update(user).set({ bannedUntil: until, bannedReason: reason }).where(eq(user.id, userId));

        const afterRows = await tx
          .select({ id: user.id, bannedUntil: user.bannedUntil, bannedReason: user.bannedReason })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1);
        const after = afterRows[0] ?? before;

        await tx.insert(adminAuditLogs).values({
          adminUserId: admin.id,
          targetUserId: userId,
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
      return;
    }

    if (req.method === "POST" && path.length === 3 && path[2] === "unban") {
      const result = await db.transaction(async (tx) => {
        const beforeRows = await tx
          .select({ id: user.id, bannedUntil: user.bannedUntil, bannedReason: user.bannedReason })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1);
        const before = beforeRows[0];
        if (!before) return { error: "user_not_found" as const };

        await tx.update(user).set({ bannedUntil: null, bannedReason: null }).where(eq(user.id, userId));

        const afterRows = await tx
          .select({ id: user.id, bannedUntil: user.bannedUntil, bannedReason: user.bannedReason })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1);
        const after = afterRows[0] ?? before;

        await tx.insert(adminAuditLogs).values({
          adminUserId: admin.id,
          targetUserId: userId,
          action: "admin.user.unban",
          before: before as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          ip,
          userAgent: ua,
        });

        return { ok: true as const, after };
      });

      if ("error" in result) {
        res.status(404).json({ error: "user_not_found" });
        return;
      }

      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === "PATCH" && path.length === 2) {
      const body = parseJsonBody(req);
      if (!isRecord(body)) {
        res.status(400).json({ error: "invalid_body" });
        return;
      }

      const allowedRoles = new Set(["user", "admin", "moderator", "member"]);
      const next: Record<string, unknown> = {};

      if ("xp" in body) {
        const v = Number(body.xp);
        if (!Number.isFinite(v) || v < 0 || v > 1_000_000_000) {
          res.status(400).json({ error: "invalid_xp" });
          return;
        }
        next.xp = Math.floor(v);
      }

      if ("brainCoins" in body) {
        const v = Number(body.brainCoins);
        if (!Number.isFinite(v) || v < 0 || v > 1_000_000_000) {
          res.status(400).json({ error: "invalid_brain_coins" });
          return;
        }
        next.brainCoins = Math.floor(v);
      }

      if ("energyCurrent" in body) {
        const v = Number(body.energyCurrent);
        if (!Number.isFinite(v) || v < 0 || v > 999) {
          res.status(400).json({ error: "invalid_energy" });
          return;
        }
        next.energyCurrent = Math.floor(v);
      }

      if ("energyLastUpdated" in body) {
        const d = parseDate(body.energyLastUpdated);
        if (!d && body.energyLastUpdated !== null) {
          res.status(400).json({ error: "invalid_energy_last_updated" });
          return;
        }
        next.energyLastUpdated = d;
      }

      if ("checkInLastDate" in body) {
        const v = body.checkInLastDate;
        if (v === null) next.checkInLastDate = null;
        else {
          const key = parseDateKey(v);
          if (!key) {
            res.status(400).json({ error: "invalid_checkin_last_date" });
            return;
          }
          next.checkInLastDate = key;
        }
      }

      if ("checkInStreak" in body) {
        const v = Number(body.checkInStreak);
        if (!Number.isFinite(v) || v < 0 || v > 10_000) {
          res.status(400).json({ error: "invalid_checkin_streak" });
          return;
        }
        next.checkInStreak = Math.floor(v);
      }

      if ("inventory" in body) {
        const v = body.inventory;
        if (!v || typeof v !== "object" || Array.isArray(v)) {
          res.status(400).json({ error: "invalid_inventory" });
          return;
        }
        next.inventory = v;
      }

      if ("ownedItems" in body) {
        const v = body.ownedItems;
        if (!Array.isArray(v)) {
          res.status(400).json({ error: "invalid_owned_items" });
          return;
        }
        next.ownedItems = v;
      }

      if ("brainStats" in body) {
        const v = body.brainStats;
        if (!v || typeof v !== "object" || Array.isArray(v)) {
          res.status(400).json({ error: "invalid_brain_stats" });
          return;
        }
        next.brainStats = v;
      }

      if ("bannedUntil" in body) {
        const d = parseDate(body.bannedUntil);
        if (!d && body.bannedUntil !== null) {
          res.status(400).json({ error: "invalid_banned_until" });
          return;
        }
        next.bannedUntil = d;
      }

      if ("bannedReason" in body) {
        const v = body.bannedReason;
        if (v !== null && v !== undefined && typeof v !== "string") {
          res.status(400).json({ error: "invalid_banned_reason" });
          return;
        }
        next.bannedReason = v ?? null;
      }

      if ("role" in body) {
        const v = body.role;
        if (typeof v !== "string" || !allowedRoles.has(v)) {
          res.status(400).json({ error: "invalid_role" });
          return;
        }
        next.role = v;
      }

      if (Object.keys(next).length === 0) {
        res.status(400).json({ error: "no_updates" });
        return;
      }

      try {
        const result = await db.transaction(async (tx) => {
          const beforeRows = await tx
            .select({
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              xp: user.xp,
              brainCoins: user.brainCoins,
              energyCurrent: user.energyCurrent,
              energyLastUpdated: user.energyLastUpdated,
              checkInLastDate: user.checkInLastDate,
              checkInStreak: user.checkInStreak,
              inventory: user.inventory,
              ownedItems: user.ownedItems,
              brainStats: user.brainStats,
              bannedUntil: user.bannedUntil,
              bannedReason: user.bannedReason,
            })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);
          const before = beforeRows[0];
          if (!before) return { error: "user_not_found" as const };

          await tx.update(user).set(next as any).where(eq(user.id, userId));

          const afterRows = await tx
            .select({
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              xp: user.xp,
              brainCoins: user.brainCoins,
              energyCurrent: user.energyCurrent,
              energyLastUpdated: user.energyLastUpdated,
              checkInLastDate: user.checkInLastDate,
              checkInStreak: user.checkInStreak,
              inventory: user.inventory,
              ownedItems: user.ownedItems,
              brainStats: user.brainStats,
              bannedUntil: user.bannedUntil,
              bannedReason: user.bannedReason,
            })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);
          const after = afterRows[0] ?? before;

          await tx.insert(adminAuditLogs).values({
            adminUserId: admin.id,
            targetUserId: userId,
            action: "admin.user.update",
            before: before as unknown as Record<string, unknown>,
            after: after as unknown as Record<string, unknown>,
            ip,
            userAgent: ua,
          });

          return { ok: true as const };
        });

        if ("error" in result) {
          res.status(404).json({ error: "user_not_found" });
          return;
        }

        res.status(200).json({ ok: true });
        return;
      } catch {
        res.status(500).json({ error: "server_error" });
        return;
      }
    }
  }

  if (req.method === "GET" && path.length === 1 && path[0] === "audit-logs") {
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
    return;
  }

  if (req.method === "GET" && path.length === 2 && path[0] === "audit-logs" && path[1] === "export") {
    const adminUserId = (url.searchParams.get("adminUserId") ?? "").trim();
    const targetUserId = (url.searchParams.get("targetUserId") ?? "").trim();
    const from = parseDate(url.searchParams.get("from"));
    const to = parseDate(url.searchParams.get("to"));

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
      .limit(5000);

    const header = ["createdAt", "action", "adminUserId", "targetUserId", "ip", "userAgent", "before", "after"];
    const lines = [header.map(toCsvCell).join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.createdAt.toISOString(),
          r.action,
          r.adminUserId ?? "",
          r.targetUserId ?? "",
          r.ip ?? "",
          r.userAgent ?? "",
          r.before ?? {},
          r.after ?? {},
        ]
          .map(toCsvCell)
          .join(",")
      );
    }
    const csv = lines.join("\n");

    const r = res as unknown as {
      setHeader?: (name: string, value: string) => void;
      send?: (body: string) => void;
      end?: (body?: string) => void;
    };
    r.setHeader?.("Content-Type", "text/csv; charset=utf-8");
    r.setHeader?.("Content-Disposition", 'attachment; filename="admin_audit_logs.csv"');
    if (r.send) r.send(csv);
    else if (r.end) r.end(csv);
    else res.status(200).json({ csv });
    return;
  }

  if (path.length === 1 && path[0] === "feature-flags") {
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
      return;
    } catch {
      res.status(500).json({ error: "server_error" });
      return;
    }
  }

  res.status(404).json({ error: "not_found" });
}
