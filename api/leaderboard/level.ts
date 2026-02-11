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
      brainLevel: user.brainLevel,
      xp: user.xp,
      brainCoins: user.brainCoins,
    })
    .from(user)
    .orderBy(desc(user.brainLevel), desc(user.xp), desc(user.brainCoins), desc(user.updatedAt))
    .limit(TOP_N);

  const entries = rows.map((r, idx) => ({
    rank: idx + 1,
    userId: r.id,
    displayName: r.name,
    avatarUrl: r.image ?? null,
    brainLevel: r.brainLevel ?? 1,
    xp: r.xp ?? 0,
    brainCoins: r.brainCoins ?? 0,
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
        brainLevel: user.brainLevel,
        xp: user.xp,
        brainCoins: user.brainCoins,
      })
      .from(user)
      .where(eq(user.id, sessionUser.id))
      .limit(1);

    const me = meRows[0];
    if (me) {
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

      myRank = (higherRows[0]?.count ?? 0) + 1;
      myEntry = {
        rank: myRank,
        userId: me.id,
        displayName: me.name,
        avatarUrl: me.image ?? null,
        brainLevel: meLevel,
        xp: meXp,
        brainCoins: meCoins,
      };
    }
  } catch {
    myRank = null;
    myEntry = null;
  }

  res.status(200).json({ entries, myRank, myEntry });
}

