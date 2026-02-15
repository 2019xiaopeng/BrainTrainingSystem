import { and, eq, gt, or, sql } from "drizzle-orm";
import { db } from "../../_lib/db/index.js";
import { featureFlags, leaderboardSnapshots, user } from "../../_lib/db/schema/index.js";
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
      brainCoins: user.brainCoins,
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

  const meCoins = me.brainCoins ?? 0;
  const meXp = me.xp ?? 0;

  const higherRows = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(user)
    .where(
      or(
        gt(user.brainCoins, meCoins),
        and(eq(user.brainCoins, meCoins), gt(user.xp, meXp)),
        and(eq(user.brainCoins, meCoins), eq(user.xp, meXp), gt(user.id, me.id))
      )
    );

  const myRank = (higherRows[0]?.count ?? 0) + 1;

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
      brainCoins: meCoins,
      brainLevel: me.brainLevel ?? 1,
      medal: medalFor(myRank),
    },
  });
}
