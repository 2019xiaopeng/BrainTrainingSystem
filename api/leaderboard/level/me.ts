import { and, eq, gt, or, sql } from "drizzle-orm";
import { client, db } from "../../_lib/db/index.js";
import { featureFlags, leaderboardSnapshots, user } from "../../_lib/db/schema/index.js";
import { requireSessionUser } from "../../_lib/session.js";
import type { RequestLike, ResponseLike } from "../../_lib/http.js";

const getUrl = (req: RequestLike): string => {
  const raw = (req as unknown as { url?: unknown }).url;
  return typeof raw === "string" ? raw : "http://localhost/api/leaderboard/level/me";
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

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
    weeklyEnabled = Boolean(payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as any).weeklyEnabled : false);
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
}
