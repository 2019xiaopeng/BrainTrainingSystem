import { and, desc, eq, gt, or, sql } from "drizzle-orm";
import { db } from "../_lib/db/index.js";
import { user } from "../_lib/db/schema/index.js";
import { requireSessionUser } from "../_lib/session.js";
import type { RequestLike, ResponseLike } from "../_lib/http.js";

const TOP_N = 50;

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      brainCoins: user.brainCoins,
      xp: user.xp,
      brainLevel: user.brainLevel,
    })
    .from(user)
    .orderBy(desc(user.brainCoins), desc(user.xp), desc(user.brainLevel), desc(user.updatedAt))
    .limit(TOP_N);

  const entries = rows.map((r, idx) => ({
    rank: idx + 1,
    userId: r.id,
    displayName: r.name,
    avatarUrl: r.image ?? null,
    brainCoins: r.brainCoins ?? 0,
    brainLevel: r.brainLevel ?? 1,
  }));

  let myRank: number | null = null;
  let myEntry: (typeof entries)[number] | null = null;

  try {
    const sessionUser = await requireSessionUser(req);
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
    if (me) {
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

      myRank = (higherRows[0]?.count ?? 0) + 1;
      myEntry = {
        rank: myRank,
        userId: me.id,
        displayName: me.name,
        avatarUrl: me.image ?? null,
        brainCoins: meCoins,
        brainLevel: me.brainLevel ?? 1,
      };
    }
  } catch {
    myRank = null;
    myEntry = null;
  }

  res.status(200).json({ entries, myRank, myEntry });
}

