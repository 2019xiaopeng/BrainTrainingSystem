import { and, desc, eq, gte, gt, lt, or, sql } from "drizzle-orm";
import { client, db } from "../../server/_lib/db/index.js";
import { dailyActivity, featureFlags, leaderboardSnapshots, user } from "../../server/_lib/db/schema/index.js";
import { requireSessionUser } from "../../server/_lib/session.js";
import type { RequestLike, ResponseLike } from "../../server/_lib/http.js";

const getUrl = (req: RequestLike): string => {
  const raw = (req as unknown as { url?: unknown }).url;
  return typeof raw === "string" ? raw : "http://localhost/api/leaderboard/level";
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

const handleMe = async (req: RequestLike, res: ResponseLike) => {
  const r = res as unknown as { setHeader?: (name: string, value: string) => void };
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
    weeklyEnabled = Boolean(isRecord(payload) ? payload.weeklyEnabled : false);
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

  const medalFor = (rank: number) => (rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : null);

  if (scope === "week") {
    const nowUtc = new Date();
    const todayUtc = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()));
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

  const meLevel = me.brainLevel ?? 1;
  const meXp = me.xp ?? 0;
  const meCoins = me.brainCoins ?? 0;

  const higherRows = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(user)
    .where(
      or(
        gt(user.brainLevel, meLevel),
        and(eq(user.brainLevel, meLevel), gt(user.xp, meXp)),
        and(eq(user.brainLevel, meLevel), eq(user.xp, meXp), gt(user.brainCoins, meCoins)),
        and(eq(user.brainLevel, meLevel), eq(user.xp, meXp), eq(user.brainCoins, meCoins), gt(user.id, me.id))
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
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const r = res as unknown as { setHeader?: (name: string, value: string) => void };
  const url = new URL(getUrl(req), "http://localhost");
  const op = (url.searchParams.get("op") ?? "").trim();
  if (op === "me") {
    await handleMe(req, res);
    return;
  }
  const scope = (url.searchParams.get("scope") ?? "all").trim() || "all";

  let leaderboardEnabled = false;
  let leaderboardPayload: Record<string, unknown> = {};
  try {
    const flagRows = await db
      .select({ enabled: featureFlags.enabled, payload: featureFlags.payload })
      .from(featureFlags)
      .where(eq(featureFlags.key, "leaderboard"))
      .limit(1);
    leaderboardEnabled = flagRows[0]?.enabled ?? false;
    leaderboardPayload =
      flagRows[0]?.payload && typeof flagRows[0].payload === "object" && !Array.isArray(flagRows[0].payload)
        ? (flagRows[0].payload as Record<string, unknown>)
        : {};
  } catch {
    leaderboardEnabled = false;
    leaderboardPayload = {};
  }
  if (!leaderboardEnabled) {
    res.status(503).json({ error: "leaderboard_disabled" });
    return;
  }

  const hideGuests = Boolean(leaderboardPayload.hideGuests ?? false);
  const weeklyEnabled = Boolean(leaderboardPayload.weeklyEnabled ?? false);
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
      const sessionUser = await requireSessionUser(req);
      viewerUserId = sessionUser.id;
    } catch {
      viewerUserId = null;
    }
  }
  if (hideGuests && !viewerUserId) {
    res.status(401).json({ error: "login_required" });
    return;
  }

  const topN = Math.max(1, Math.min(100, Number(leaderboardPayload.topN ?? 10) || 10));
  const version = Math.max(1, Math.floor(Number(leaderboardPayload.version ?? 1) || 1));
  const ttlSeconds = Number(leaderboardPayload.snapshotTtlSeconds ?? 60);
  const ttlMsRaw =
    Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds * 1000 : Number(leaderboardPayload.snapshotTtlMs ?? 60_000);
  const snapshotTtlMs = Math.max(5_000, Math.min(3_600_000, Number(ttlMsRaw) || 60_000));

  const now = Date.now();
  const kind = `level:${scope}`;
  const fallbackKind = "level";

  const readSnapshot = async (k: string) =>
    await db
      .select({ computedAt: leaderboardSnapshots.computedAt, payload: leaderboardSnapshots.payload })
      .from(leaderboardSnapshots)
      .where(eq(leaderboardSnapshots.kind, k))
      .limit(1);

  let snapRows = await readSnapshot(kind);
  if (snapRows.length === 0) snapRows = await readSnapshot(fallbackKind);

  let snapshotPayload: unknown | null = snapRows[0]?.payload ?? null;
  const computedAtMs = snapRows[0]?.computedAt ? snapRows[0].computedAt.getTime() : 0;
  const payloadConfig = isRecord(snapshotPayload) && isRecord(snapshotPayload.config) ? snapshotPayload.config : null;
  const payloadVersion = payloadConfig ? Math.floor(Number(payloadConfig.version ?? 0) || 0) : 0;
  const payloadTopN = payloadConfig ? Math.floor(Number(payloadConfig.topN ?? 0) || 0) : 0;
  const isFresh = computedAtMs > 0 && now - computedAtMs < snapshotTtlMs && payloadVersion === version && payloadTopN === topN;

  if (!snapshotPayload || !isFresh) {
    let refreshed = false;
    try {
      refreshed = await db.transaction(async (tx) => {
        const lockKey = `leaderboard:${kind}`;
        const lockedRows = (await tx.execute(
          sql`select pg_try_advisory_xact_lock(hashtext(${lockKey})) as locked`
        )) as unknown as Array<{ locked?: boolean }>;
        const locked = Boolean(lockedRows[0]?.locked);
        if (!locked) return false;

        const nowUtc = new Date();
        const todayUtc = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()));
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
                .where(and(gte(dailyActivity.date, weekStartKey), lt(dailyActivity.date, weekEndKey)))
                .groupBy(user.id)
                .orderBy(desc(weeklyXpExpr), desc(user.brainLevel), desc(user.xp), desc(user.brainCoins), desc(user.updatedAt))
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
                .orderBy(desc(user.brainLevel), desc(user.xp), desc(user.brainCoins), desc(user.updatedAt))
                .limit(topN);

        const computedAt = new Date();
        const payload = {
          computedAt: computedAt.toISOString(),
          kind: "level",
          scope,
          config: {
            topN,
            version,
            ...(scope === "week" ? { window: { type: "week", start: weekStartKey, end: weekEndKey } } : {}),
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

  const medalFor = (rank: number) => (rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : null);

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

  const computedAtIso = snapRows[0]?.computedAt ? snapRows[0].computedAt.toISOString() : new Date().toISOString();
  r.setHeader?.("Cache-Control", hideGuests ? "private, no-store" : "public, max-age=30, stale-while-revalidate=120");
  res.status(200).json({
    kind: "level",
    scope,
    computedAt: computedAtIso,
    config: { topN, version },
    entries,
  });
}
