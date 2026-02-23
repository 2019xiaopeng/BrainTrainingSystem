/**
 * Consolidated Leaderboard API Router
 *
 * Routes:
 *   GET /api/leaderboard/coins      → public coins leaderboard
 *   GET /api/leaderboard/level      → public level leaderboard
 *   GET /api/leaderboard/coins/me   → current user's coins rank
 *   GET /api/leaderboard/level/me   → current user's level rank
 *
 * Consolidation rationale: Vercel Hobby plan allows max 12 serverless functions.
 * The four individual leaderboard files are merged into this single catch-all
 * entry point to stay within the limit while preserving all original behaviour.
 */

import { and, desc, eq, gt, gte, lt, or, sql } from "drizzle-orm";
import { client, db } from "../_lib/db/index.js";
import {
  dailyActivity,
  featureFlags,
  gameSessions,
  leaderboardSnapshots,
  user,
} from "../_lib/db/schema/index.js";
import { requireSessionUser } from "../_lib/session.js";
import type { RequestLike, ResponseLike } from "../_lib/http.js";

/* ──────────────────────────── Shared helpers ──────────────────────────── */

const getUrl = (req: RequestLike): string => {
  const raw = (req as unknown as { url?: unknown }).url;
  return typeof raw === "string" ? raw : "http://localhost/api/leaderboard";
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const medalFor = (rank: number) =>
  rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : null;

/** Parse URL to extract the sub-route segments after /api/leaderboard */
const parseSubRoute = (req: RequestLike): string[] => {
  const url = new URL(getUrl(req), "http://localhost");
  const segs = url.pathname.split("/").filter(Boolean);
  const idx = segs.indexOf("leaderboard");
  return idx >= 0 ? segs.slice(idx + 1) : [];
};

/** Load the leaderboard feature-flag row. Shared by all four handlers. */
const loadFeatureFlag = async () => {
  let enabled = false;
  let payload: Record<string, unknown> = {};
  try {
    const flagRows = await db
      .select({ enabled: featureFlags.enabled, payload: featureFlags.payload })
      .from(featureFlags)
      .where(eq(featureFlags.key, "leaderboard"))
      .limit(1);
    enabled = flagRows[0]?.enabled ?? false;
    const raw = flagRows[0]?.payload;
    payload =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
  } catch {
    enabled = false;
    payload = {};
  }
  return { enabled, payload };
};

const readSnapshot = async (k: string) =>
  await db
    .select({
      computedAt: leaderboardSnapshots.computedAt,
      payload: leaderboardSnapshots.payload,
    })
    .from(leaderboardSnapshots)
    .where(eq(leaderboardSnapshots.kind, k))
    .limit(1);

/* ──────────────────────── GET /leaderboard/coins ──────────────────────── */

async function handleCoins(req: RequestLike, res: ResponseLike) {
  const r = res as unknown as { setHeader?: (n: string, v: string) => void };
  const url = new URL(getUrl(req), "http://localhost");
  const scope = (url.searchParams.get("scope") ?? "all").trim() || "all";
  if (scope !== "all") {
    res.status(400).json({ error: "invalid_scope" });
    return;
  }

  const { enabled, payload: lbPayload } = await loadFeatureFlag();
  if (!enabled) {
    res.status(503).json({ error: "leaderboard_disabled" });
    return;
  }

  const hideGuests = Boolean(lbPayload.hideGuests ?? false);
  let viewerUserId: string | null = null;
  if (hideGuests) {
    try {
      const su = await requireSessionUser(req);
      viewerUserId = su.id;
    } catch {
      viewerUserId = null;
    }
  }
  if (hideGuests && !viewerUserId) {
    res.status(401).json({ error: "login_required" });
    return;
  }

  const topN = Math.max(1, Math.min(100, Number(lbPayload.topN ?? 10) || 10));
  const version = Math.max(1, Math.floor(Number(lbPayload.version ?? 1) || 1));
  const ttlSeconds = Number(lbPayload.snapshotTtlSeconds ?? 60);
  const ttlMsRaw =
    Number.isFinite(ttlSeconds) && ttlSeconds > 0
      ? ttlSeconds * 1000
      : Number(lbPayload.snapshotTtlMs ?? 60_000);
  const snapshotTtlMs = Math.max(5_000, Math.min(3_600_000, Number(ttlMsRaw) || 60_000));

  const now = Date.now();
  const kind = `coins:${scope}`;
  const fallbackKind = "coins";

  let snapRows = await readSnapshot(kind);
  if (snapRows.length === 0) snapRows = await readSnapshot(fallbackKind);

  let snapshotPayload: unknown | null = snapRows[0]?.payload ?? null;
  const computedAtMs = snapRows[0]?.computedAt ? snapRows[0].computedAt.getTime() : 0;
  const payloadConfig =
    isRecord(snapshotPayload) && isRecord(snapshotPayload.config) ? snapshotPayload.config : null;
  const payloadVersion = payloadConfig ? Math.floor(Number(payloadConfig.version ?? 0) || 0) : 0;
  const payloadTopN = payloadConfig ? Math.floor(Number(payloadConfig.topN ?? 0) || 0) : 0;
  const payloadEntriesRaw = (snapshotPayload as { entries?: unknown } | null)?.entries;
  const firstEntry = Array.isArray(payloadEntriesRaw) ? payloadEntriesRaw[0] : null;
  const payloadHasScore = isRecord(firstEntry) && "totalScore" in firstEntry;
  const isFresh =
    computedAtMs > 0 &&
    now - computedAtMs < snapshotTtlMs &&
    payloadVersion === version &&
    payloadTopN === topN &&
    payloadHasScore;

  if (!snapshotPayload || !isFresh) {
    let refreshed = false;
    try {
      refreshed = await db.transaction(async (tx) => {
        const lockKey = `leaderboard:${kind}`;
        const lockedRows = (await tx.execute(
          sql`select pg_try_advisory_xact_lock(hashtext(${lockKey})) as locked`
        )) as unknown as Array<{ locked?: boolean }>;
        if (!Boolean(lockedRows[0]?.locked)) return false;

        const totalScoreExpr = sql<number>`coalesce(sum(${gameSessions.score}), 0)`;
        const rows = await tx
          .select({
            id: user.id,
            name: user.name,
            image: user.image,
            totalScore: totalScoreExpr.as("totalScore"),
            brainLevel: user.brainLevel,
            xp: user.xp,
            updatedAt: user.updatedAt,
          })
          .from(user)
          .leftJoin(gameSessions, eq(gameSessions.userId, user.id))
          .groupBy(user.id, user.name, user.image, user.brainLevel, user.xp, user.updatedAt)
          .orderBy(desc(totalScoreExpr), desc(user.xp), desc(user.brainLevel), desc(user.updatedAt))
          .limit(topN);

        const computedAt = new Date();
        const payload = {
          computedAt: computedAt.toISOString(),
          kind: "coins",
          scope,
          config: { topN, version },
          entries: rows.map((r, idx) => ({
            rank: idx + 1,
            userId: r.id,
            displayName: r.name,
            avatarUrl: r.image ?? null,
            totalScore: (r as any).totalScore ?? 0,
            brainLevel: r.brainLevel ?? 1,
          })),
        };

        await tx
          .insert(leaderboardSnapshots)
          .values({ kind, computedAt, payload: payload as Record<string, unknown> })
          .onConflictDoUpdate({
            target: leaderboardSnapshots.kind,
            set: { computedAt, payload: payload as Record<string, unknown> },
          });
        return true;
      });
    } catch {
      refreshed = false;
    }

    if (refreshed) {
      snapRows = await readSnapshot(kind);
      snapshotPayload = snapRows[0]?.payload ?? null;
    }
    if (!snapshotPayload) {
      res.status(503).json({ error: "server_busy" });
      return;
    }
  }

  const payloadEntries: Array<{
    rank: number;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    totalScore: number;
    brainLevel: number;
  }> = Array.isArray(
    (snapshotPayload as { entries?: unknown } | null)?.entries
  )
    ? ((snapshotPayload as { entries: unknown }).entries as typeof payloadEntries)
    : [];

  const entries = payloadEntries.map((r) => ({
    rank: r.rank,
    userId: r.userId,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl ?? null,
    totalScore: r.totalScore ?? 0,
    brainLevel: r.brainLevel ?? 1,
    medal: medalFor(r.rank),
  }));

  const computedAtIso = snapRows[0]?.computedAt
    ? snapRows[0].computedAt.toISOString()
    : new Date().toISOString();
  r.setHeader?.(
    "Cache-Control",
    hideGuests ? "private, no-store" : "public, max-age=30, stale-while-revalidate=120"
  );
  res.status(200).json({ kind: "coins", scope, computedAt: computedAtIso, config: { topN, version }, entries });
}

/* ─────────────────────── GET /leaderboard/level ─────────────────────── */

async function handleLevel(req: RequestLike, res: ResponseLike) {
  const r = res as unknown as { setHeader?: (n: string, v: string) => void };
  const url = new URL(getUrl(req), "http://localhost");
  const scope = (url.searchParams.get("scope") ?? "all").trim() || "all";

  const { enabled, payload: lbPayload } = await loadFeatureFlag();
  if (!enabled) {
    res.status(503).json({ error: "leaderboard_disabled" });
    return;
  }

  const hideGuests = Boolean(lbPayload.hideGuests ?? false);
  const weeklyEnabled = Boolean(lbPayload.weeklyEnabled ?? false);
  if (scope === "week" && !weeklyEnabled) {
    res.status(400).json({ error: "invalid_scope" });
    return;
  }
  if (scope !== "all" && scope !== "week") {
    res.status(400).json({ error: "invalid_scope" });
    return;
  }

  let viewerUserId: string | null = null;
  if (hideGuests) {
    try {
      const su = await requireSessionUser(req);
      viewerUserId = su.id;
    } catch {
      viewerUserId = null;
    }
  }
  if (hideGuests && !viewerUserId) {
    res.status(401).json({ error: "login_required" });
    return;
  }

  const topN = Math.max(1, Math.min(100, Number(lbPayload.topN ?? 10) || 10));
  const version = Math.max(1, Math.floor(Number(lbPayload.version ?? 1) || 1));
  const ttlSeconds = Number(lbPayload.snapshotTtlSeconds ?? 60);
  const ttlMsRaw =
    Number.isFinite(ttlSeconds) && ttlSeconds > 0
      ? ttlSeconds * 1000
      : Number(lbPayload.snapshotTtlMs ?? 60_000);
  const snapshotTtlMs = Math.max(5_000, Math.min(3_600_000, Number(ttlMsRaw) || 60_000));

  const now = Date.now();
  const kind = `level:${scope}`;
  const fallbackKind = "level";

  let snapRows = await readSnapshot(kind);
  if (snapRows.length === 0) snapRows = await readSnapshot(fallbackKind);

  let snapshotPayload: unknown | null = snapRows[0]?.payload ?? null;
  const computedAtMs = snapRows[0]?.computedAt ? snapRows[0].computedAt.getTime() : 0;
  const payloadConfig =
    isRecord(snapshotPayload) && isRecord(snapshotPayload.config) ? snapshotPayload.config : null;
  const payloadVersion = payloadConfig ? Math.floor(Number(payloadConfig.version ?? 0) || 0) : 0;
  const payloadTopN = payloadConfig ? Math.floor(Number(payloadConfig.topN ?? 0) || 0) : 0;
  const isFresh =
    computedAtMs > 0 &&
    now - computedAtMs < snapshotTtlMs &&
    payloadVersion === version &&
    payloadTopN === topN;

  if (!snapshotPayload || !isFresh) {
    let refreshed = false;
    try {
      refreshed = await db.transaction(async (tx) => {
        const lockKey = `leaderboard:${kind}`;
        const lockedRows = (await tx.execute(
          sql`select pg_try_advisory_xact_lock(hashtext(${lockKey})) as locked`
        )) as unknown as Array<{ locked?: boolean }>;
        if (!Boolean(lockedRows[0]?.locked)) return false;

        const nowUtc = new Date();
        const todayUtc = new Date(
          Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate())
        );
        const day = todayUtc.getUTCDay();
        const sinceMonday = (day + 6) % 7;
        const weekStart = new Date(todayUtc);
        weekStart.setUTCDate(weekStart.getUTCDate() - sinceMonday);
        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
        const weekStartKey = weekStart.toISOString().slice(0, 10);
        const weekEndKey = weekEnd.toISOString().slice(0, 10);

        const weeklyXpExpr = sql<number>`coalesce(sum(${dailyActivity.totalXp}), 0)`;
        const rows =
          scope === "week"
            ? await tx
                .select({
                  id: user.id,
                  name: user.name,
                  image: user.image,
                  brainLevel: user.brainLevel,
                  xp: user.xp,
                  brainCoins: user.brainCoins,
                  updatedAt: user.updatedAt,
                  weeklyXp: weeklyXpExpr.as("weeklyXp"),
                })
                .from(user)
                .innerJoin(dailyActivity, eq(dailyActivity.userId, user.id))
                .where(
                  and(gte(dailyActivity.date, weekStartKey), lt(dailyActivity.date, weekEndKey))
                )
                .groupBy(user.id)
                .orderBy(
                  desc(weeklyXpExpr),
                  desc(user.brainLevel),
                  desc(user.xp),
                  desc(user.brainCoins),
                  desc(user.updatedAt)
                )
                .limit(topN)
            : await tx
                .select({
                  id: user.id,
                  name: user.name,
                  image: user.image,
                  brainLevel: user.brainLevel,
                  xp: user.xp,
                  brainCoins: user.brainCoins,
                  updatedAt: user.updatedAt,
                })
                .from(user)
                .orderBy(
                  desc(user.brainLevel),
                  desc(user.xp),
                  desc(user.brainCoins),
                  desc(user.updatedAt)
                )
                .limit(topN);

        const computedAt = new Date();
        const payload = {
          computedAt: computedAt.toISOString(),
          kind: "level",
          scope,
          config: {
            topN,
            version,
            ...(scope === "week"
              ? { window: { type: "week", start: weekStartKey, end: weekEndKey } }
              : {}),
          },
          entries: rows.map((r, idx) => ({
            rank: idx + 1,
            userId: r.id,
            displayName: r.name,
            avatarUrl: r.image ?? null,
            brainLevel: r.brainLevel ?? 1,
            xp: r.xp ?? 0,
            brainCoins: r.brainCoins ?? 0,
            ...(scope === "week" ? { weeklyXp: (r as any).weeklyXp ?? 0 } : {}),
          })),
        };

        await tx
          .insert(leaderboardSnapshots)
          .values({ kind, computedAt, payload: payload as Record<string, unknown> })
          .onConflictDoUpdate({
            target: leaderboardSnapshots.kind,
            set: { computedAt, payload: payload as Record<string, unknown> },
          });
        return true;
      });
    } catch {
      refreshed = false;
    }

    if (refreshed) {
      snapRows = await readSnapshot(kind);
      snapshotPayload = snapRows[0]?.payload ?? null;
    }
    if (!snapshotPayload) {
      res.status(503).json({ error: "server_busy" });
      return;
    }
  }

  const payloadEntriesRaw = (snapshotPayload as { entries?: unknown } | null)?.entries;
  const payloadEntries: Array<{
    rank: number;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    brainLevel: number;
    xp: number;
    brainCoins: number;
    weeklyXp?: number;
  }> = Array.isArray(payloadEntriesRaw) ? (payloadEntriesRaw as typeof payloadEntries) : [];

  const entries = payloadEntries.map((r) => ({
    rank: r.rank,
    userId: r.userId,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl ?? null,
    brainLevel: r.brainLevel ?? 1,
    xp: r.xp ?? 0,
    brainCoins: r.brainCoins ?? 0,
    ...(scope === "week" ? { weeklyXp: r.weeklyXp ?? 0 } : {}),
    medal: medalFor(r.rank),
  }));

  const computedAtIso = snapRows[0]?.computedAt
    ? snapRows[0].computedAt.toISOString()
    : new Date().toISOString();
  r.setHeader?.(
    "Cache-Control",
    hideGuests ? "private, no-store" : "public, max-age=30, stale-while-revalidate=120"
  );
  res.status(200).json({ kind: "level", scope, computedAt: computedAtIso, config: { topN, version }, entries });
}

/* ────────────────────── GET /leaderboard/coins/me ────────────────────── */

async function handleCoinsMe(req: RequestLike, res: ResponseLike) {
  const r = res as unknown as { setHeader?: (n: string, v: string) => void };
  r.setHeader?.("Cache-Control", "private, no-store");

  let leaderboardEnabled = false;
  try {
    const flagRows = await db
      .select({ enabled: featureFlags.enabled })
      .from(featureFlags)
      .where(eq(featureFlags.key, "leaderboard"))
      .limit(1);
    leaderboardEnabled = flagRows[0]?.enabled ?? false;
  } catch {
    leaderboardEnabled = false;
  }
  if (!leaderboardEnabled) {
    res.status(503).json({ error: "leaderboard_disabled" });
    return;
  }

  let sessionUser;
  try {
    sessionUser = await requireSessionUser(req);
  } catch {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const snapRows = await db
    .select({ computedAt: leaderboardSnapshots.computedAt })
    .from(leaderboardSnapshots)
    .where(eq(leaderboardSnapshots.kind, "coins:all"))
    .limit(1);
  const computedAt =
    snapRows[0]?.computedAt
      ? snapRows[0].computedAt.toISOString()
      : (
          await db
            .select({ computedAt: leaderboardSnapshots.computedAt })
            .from(leaderboardSnapshots)
            .where(eq(leaderboardSnapshots.kind, "coins"))
            .limit(1)
        )[0]?.computedAt?.toISOString() ?? null;

  const meRows = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      xp: user.xp,
      brainLevel: user.brainLevel,
    })
    .from(user)
    .where(eq(user.id, sessionUser.id))
    .limit(1);

  const me = meRows[0];
  if (!me) {
    res.status(404).json({ error: "user_not_found" });
    return;
  }

  const meXp = me.xp ?? 0;
  const scoreRows = await db
    .select({
      totalScore: sql<number>`coalesce(sum(${gameSessions.score}), 0)`.mapWith(Number),
    })
    .from(gameSessions)
    .where(eq(gameSessions.userId, me.id));
  const meScore = scoreRows[0]?.totalScore ?? 0;

  const rankRows = (await db.transaction(async (tx) => {
    return (await tx.execute(sql`
      with scores as (
        select
          u."id" as "id",
          u."xp" as "xp",
          coalesce(sum(gs."score"), 0) as "totalScore"
        from "user" u
        left join "game_sessions" gs on gs."user_id" = u."id"
        group by u."id"
      )
      select count(*)::int as "higherCount"
      from scores s
      where
        s."totalScore" > ${meScore}
        or (s."totalScore" = ${meScore} and s."xp" > ${meXp})
        or (s."totalScore" = ${meScore} and s."xp" = ${meXp} and s."id" > ${me.id})
    `)) as unknown;
  })) as unknown as Array<{ higherCount?: number }>;
  const higherCount = Number(rankRows[0]?.higherCount ?? 0) || 0;
  const myRank = higherCount + 1;

  res.status(200).json({
    kind: "coins",
    scope: "all",
    computedAt,
    myRank,
    myEntry: {
      rank: myRank,
      userId: me.id,
      displayName: me.name,
      avatarUrl: me.image ?? null,
      totalScore: meScore,
      brainLevel: me.brainLevel ?? 1,
      medal: medalFor(myRank),
    },
  });
}

/* ────────────────────── GET /leaderboard/level/me ────────────────────── */

async function handleLevelMe(req: RequestLike, res: ResponseLike) {
  const r = res as unknown as { setHeader?: (n: string, v: string) => void };
  r.setHeader?.("Cache-Control", "private, no-store");

  const url = new URL(getUrl(req), "http://localhost");
  const scope = (url.searchParams.get("scope") ?? "all").trim() || "all";

  let leaderboardEnabled = false;
  let weeklyEnabled = false;
  try {
    const flagRows = await db
      .select({ enabled: featureFlags.enabled, payload: featureFlags.payload })
      .from(featureFlags)
      .where(eq(featureFlags.key, "leaderboard"))
      .limit(1);
    leaderboardEnabled = flagRows[0]?.enabled ?? false;
    const payload = flagRows[0]?.payload;
    weeklyEnabled = Boolean(
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as any).weeklyEnabled
        : false
    );
  } catch {
    leaderboardEnabled = false;
    weeklyEnabled = false;
  }
  if (!leaderboardEnabled) {
    res.status(503).json({ error: "leaderboard_disabled" });
    return;
  }
  if (scope === "week" && !weeklyEnabled) {
    res.status(400).json({ error: "invalid_scope" });
    return;
  }
  if (scope !== "all" && scope !== "week") {
    res.status(400).json({ error: "invalid_scope" });
    return;
  }

  let sessionUser;
  try {
    sessionUser = await requireSessionUser(req);
  } catch {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const computedAtRows = await db
    .select({ computedAt: leaderboardSnapshots.computedAt })
    .from(leaderboardSnapshots)
    .where(eq(leaderboardSnapshots.kind, scope === "week" ? "level:week" : "level:all"))
    .limit(1);
  const computedAt =
    computedAtRows[0]?.computedAt
      ? computedAtRows[0].computedAt.toISOString()
      : (
          await db
            .select({ computedAt: leaderboardSnapshots.computedAt })
            .from(leaderboardSnapshots)
            .where(eq(leaderboardSnapshots.kind, "level"))
            .limit(1)
        )[0]?.computedAt?.toISOString() ?? null;

  const meRows = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      brainLevel: user.brainLevel,
      xp: user.xp,
      brainCoins: user.brainCoins,
    })
    .from(user)
    .where(eq(user.id, sessionUser.id))
    .limit(1);

  const me = meRows[0];
  if (!me) {
    res.status(404).json({ error: "user_not_found" });
    return;
  }

  if (scope === "week") {
    const nowUtc = new Date();
    const todayUtc = new Date(
      Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate())
    );
    const day = todayUtc.getUTCDay();
    const sinceMonday = (day + 6) % 7;
    const weekStart = new Date(todayUtc);
    weekStart.setUTCDate(weekStart.getUTCDate() - sinceMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    const weekStartKey = weekStart.toISOString().slice(0, 10);
    const weekEndKey = weekEnd.toISOString().slice(0, 10);

    const rows = await client<
      Array<{
        id: string;
        name: string;
        image: string | null;
        brainLevel: number | null;
        xp: number | null;
        brainCoins: number | null;
        weeklyXp: number | null;
        rank: number;
      }>
    >`
      with weekly as (
        select u."id",
          u."name",
          u."image",
          u."brain_level" as "brainLevel",
          u."xp",
          u."brain_coins" as "brainCoins",
          u."updated_at" as "updatedAt",
          coalesce(sum(da."total_xp"), 0)::int as "weeklyXp"
        from "user" u
        join "daily_activity" da on da."user_id" = u."id"
        where da."date" >= ${weekStartKey} and da."date" < ${weekEndKey}
        group by u."id"
      )
      select * from (
        select *,
          dense_rank() over(order by "weeklyXp" desc, "brainLevel" desc, "xp" desc, "brainCoins" desc, "updatedAt" desc) as "rank"
        from weekly
      ) t
      where "id" = ${me.id}
      limit 1
    `;

    const row = rows[0] ?? null;
    if (!row) {
      res.status(200).json({ kind: "level", scope, computedAt, myRank: null, myEntry: null });
      return;
    }

    res.status(200).json({
      kind: "level",
      scope,
      computedAt,
      myRank: row.rank,
      myEntry: {
        rank: row.rank,
        userId: me.id,
        displayName: row.name,
        avatarUrl: row.image ?? null,
        brainLevel: row.brainLevel ?? 1,
        xp: row.xp ?? 0,
        brainCoins: row.brainCoins ?? 0,
        weeklyXp: row.weeklyXp ?? 0,
        medal: medalFor(row.rank),
      },
    });
    return;
  }

  // scope === "all"
  const meLevel = me.brainLevel ?? 1;
  const meXp = me.xp ?? 0;
  const meCoins = me.brainCoins ?? 0;

  const higherRows = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(user)
    .where(
      or(
        gt(user.brainLevel, meLevel),
        and(eq(user.brainLevel, meLevel), gt(user.xp, meXp)),
        and(eq(user.brainLevel, meLevel), eq(user.xp, meXp), gt(user.brainCoins, meCoins)),
        and(
          eq(user.brainLevel, meLevel),
          eq(user.xp, meXp),
          eq(user.brainCoins, meCoins),
          gt(user.id, me.id)
        )
      )
    );

  const myRank = (higherRows[0]?.count ?? 0) + 1;

  res.status(200).json({
    kind: "level",
    scope,
    computedAt,
    myRank,
    myEntry: {
      rank: myRank,
      userId: me.id,
      displayName: me.name,
      avatarUrl: me.image ?? null,
      brainLevel: meLevel,
      xp: meXp,
      brainCoins: meCoins,
      medal: medalFor(myRank),
    },
  });
}

/* ─────────────────────────── Main Router ─────────────────────────── */

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const sub = parseSubRoute(req);
  // sub examples: ["coins"], ["level"], ["coins","me"], ["level","me"]

  if (sub[0] === "coins" && sub[1] === "me") return handleCoinsMe(req, res);
  if (sub[0] === "level" && sub[1] === "me") return handleLevelMe(req, res);
  if (sub[0] === "coins" && !sub[1]) return handleCoins(req, res);
  if (sub[0] === "level" && !sub[1]) return handleLevel(req, res);

  res.status(404).json({ error: "not_found" });
}
