import { and, eq, sql } from "drizzle-orm";
import { db } from "../../_lib/db/index.js";
import { featureFlags, gameSessions, leaderboardSnapshots, user } from "../../_lib/db/schema/index.js";
import { requireSessionUser } from "../../_lib/session.js";
import type { RequestLike, ResponseLike } from "../../_lib/http.js";

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

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
}
