import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../server/_lib/db/index.js";
import { featureFlags, gameSessions, leaderboardSnapshots, user } from "../../server/_lib/db/schema/index.js";
import { requireSessionUser } from "../../server/_lib/session.js";
import type { RequestLike, ResponseLike } from "../../server/_lib/http.js";

const getUrl = (req: RequestLike): string => {
  const raw = (req as unknown as { url?: unknown }).url;
  return typeof raw === "string" ? raw : "http://localhost/api/leaderboard/coins";
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

const handleMe = async (req: RequestLike, res: ResponseLike) => {
  const r = res as unknown as { setHeader?: (name: string, value: string) => void };
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
    .select({ totalScore: sql<number>`coalesce(sum(${gameSessions.score}), 0)`.mapWith(Number) })
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

  const medalFor = (rank: number) => (rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : null);

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
  if (scope !== "all") {
    res.status(400).json({ error: "invalid_scope" });
    return;
  }

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
  const kind = `coins:${scope}`;
  const fallbackKind = "coins";

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
  const payloadEntriesRaw = (snapshotPayload as { entries?: unknown } | null)?.entries;
  const firstEntry = Array.isArray(payloadEntriesRaw) ? payloadEntriesRaw[0] : null;
  const payloadHasScore = isRecord(firstEntry) && ("totalScore" in firstEntry);
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
        const locked = Boolean(lockedRows[0]?.locked);
        if (!locked) return false;

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
  }> = Array.isArray(payloadEntriesRaw) ? (payloadEntriesRaw as typeof payloadEntries) : [];

  const medalFor = (rank: number) => (rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : null);

  const entries = payloadEntries.map((r) => ({
    rank: r.rank,
    userId: r.userId,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl ?? null,
    totalScore: r.totalScore ?? 0,
    brainLevel: r.brainLevel ?? 1,
    medal: medalFor(r.rank),
  }));

  const computedAtIso = snapRows[0]?.computedAt ? snapRows[0].computedAt.toISOString() : new Date().toISOString();
  r.setHeader?.("Cache-Control", hideGuests ? "private, no-store" : "public, max-age=30, stale-while-revalidate=120");
  res.status(200).json({
    kind: "coins",
    scope,
    computedAt: computedAtIso,
    config: { topN, version },
    entries,
  });
}
