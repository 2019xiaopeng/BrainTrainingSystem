import { eq } from "drizzle-orm";
import { db } from "../../../_lib/db/index.js";
import { adminAuditLogs, user } from "../../../_lib/db/schema/index.js";
import { getHeader, parseJsonBody, requireAdmin } from "../../../_lib/admin.js";
import { isRecord } from "../../../_lib/http.js";
import type { RequestLike, ResponseLike } from "../../../_lib/http.js";

const getUrl = (req: RequestLike): string => {
  const raw = (req as unknown as { url?: unknown }).url;
  return typeof raw === "string" ? raw : "http://localhost/api/admin/users/unknown";
};

const getUserIdParam = (req: RequestLike): string => {
  const q = (req as unknown as { query?: Record<string, unknown> }).query;
  const viaQuery = q ? (q["id"] ?? q["userId"] ?? q["uid"]) : null;
  if (typeof viaQuery === "string" && viaQuery.length > 0) return viaQuery;
  const url = new URL(getUrl(req), "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
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

export default async function handler(req: RequestLike, res: ResponseLike) {
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

  if (req.method === "GET") {
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
      .where(eq(user.id, id))
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

  if (req.method === "PATCH") {
    const body = parseJsonBody(req);
    if (!isRecord(body)) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    const allowedRoles = new Set(["member", "admin", "moderator"]);
    const next: Record<string, unknown> = {};

    if ("xp" in body) {
      const v = Number((body as Record<string, unknown>).xp);
      if (!Number.isFinite(v) || v < 0 || v > 1_000_000_000) {
        res.status(400).json({ error: "invalid_xp" });
        return;
      }
      next.xp = Math.floor(v);
    }

    if ("brainCoins" in body) {
      const v = Number((body as Record<string, unknown>).brainCoins);
      if (!Number.isFinite(v) || v < 0 || v > 1_000_000_000) {
        res.status(400).json({ error: "invalid_brain_coins" });
        return;
      }
      next.brainCoins = Math.floor(v);
    }

    if ("energyCurrent" in body) {
      const v = Number((body as Record<string, unknown>).energyCurrent);
      if (!Number.isFinite(v) || v < 0 || v > 999) {
        res.status(400).json({ error: "invalid_energy" });
        return;
      }
      next.energyCurrent = Math.floor(v);
    }

    if ("energyLastUpdated" in body) {
      const d = parseDate((body as Record<string, unknown>).energyLastUpdated);
      if (!d && (body as Record<string, unknown>).energyLastUpdated !== null) {
        res.status(400).json({ error: "invalid_energy_last_updated" });
        return;
      }
      next.energyLastUpdated = d;
    }

    if ("checkInLastDate" in body) {
      const v = (body as Record<string, unknown>).checkInLastDate;
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
      const v = Number((body as Record<string, unknown>).checkInStreak);
      if (!Number.isFinite(v) || v < 0 || v > 10_000) {
        res.status(400).json({ error: "invalid_checkin_streak" });
        return;
      }
      next.checkInStreak = Math.floor(v);
    }

    if ("inventory" in body) {
      const v = (body as Record<string, unknown>).inventory;
      if (!v || typeof v !== "object" || Array.isArray(v)) {
        res.status(400).json({ error: "invalid_inventory" });
        return;
      }
      next.inventory = v;
    }

    if ("ownedItems" in body) {
      const v = (body as Record<string, unknown>).ownedItems;
      if (!Array.isArray(v)) {
        res.status(400).json({ error: "invalid_owned_items" });
        return;
      }
      next.ownedItems = v;
    }

    if ("brainStats" in body) {
      const v = (body as Record<string, unknown>).brainStats;
      if (!v || typeof v !== "object" || Array.isArray(v)) {
        res.status(400).json({ error: "invalid_brain_stats" });
        return;
      }
      next.brainStats = v;
    }

    if ("bannedUntil" in body) {
      const d = parseDate((body as Record<string, unknown>).bannedUntil);
      if (!d && (body as Record<string, unknown>).bannedUntil !== null) {
        res.status(400).json({ error: "invalid_banned_until" });
        return;
      }
      next.bannedUntil = d;
    }

    if ("bannedReason" in body) {
      const v = (body as Record<string, unknown>).bannedReason;
      if (v !== null && v !== undefined && typeof v !== "string") {
        res.status(400).json({ error: "invalid_banned_reason" });
        return;
      }
      next.bannedReason = v ?? null;
    }

    if ("role" in body) {
      const v = (body as Record<string, unknown>).role;
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

    const ip = getHeader(req, "x-forwarded-for") ?? getHeader(req, "x-real-ip") ?? null;
    const ua = getHeader(req, "user-agent") ?? null;

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
          .where(eq(user.id, id))
          .limit(1);
        const before = beforeRows[0];
        if (!before) return { error: "user_not_found" as const };

        await tx.update(user).set(next as any).where(eq(user.id, id));

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
          .where(eq(user.id, id))
          .limit(1);
        const after = afterRows[0] ?? before;

        await tx.insert(adminAuditLogs).values({
          adminUserId: admin.id,
          targetUserId: id,
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

  res.status(405).json({ error: "method_not_allowed" });
}

