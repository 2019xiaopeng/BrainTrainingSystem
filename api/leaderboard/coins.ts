import { and, desc, eq, gt, or, sql } from "drizzle-orm";
import { db } from "../_lib/db/index.js";
import { featureFlags, leaderboardSnapshots, user } from "../_lib/db/schema/index.js";
import { requireSessionUser } from "../_lib/session.js";
import type { RequestLike, ResponseLike } from "../_lib/http.js";

const TOP_N = 10;
const SNAPSHOT_TTL_MS = 60_000;

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const flagRows = await db
    .select({ enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(eq(featureFlags.key, "leaderboard"))
    .limit(1);
  const leaderboardEnabled = flagRows[0]?.enabled ?? false;
  if (!leaderboardEnabled) {
    res.status(503).json({ error: "leaderboard_disabled" });
    return;
  }

  let viewerUserId: string | null = null;
  try {
    const sessionUser = await requireSessionUser(req);
    viewerUserId = sessionUser.id;
  } catch {
    viewerUserId = null;
  }

  const now = Date.now();
  const snapRows = await db
    .select({ computedAt: leaderboardSnapshots.computedAt, payload: leaderboardSnapshots.payload })
    .from(leaderboardSnapshots)
    .where(eq(leaderboardSnapshots.kind, "coins"))
    .limit(1);

  let snapshotPayload: unknown | null = snapRows[0]?.payload ?? null;
  const computedAtMs = snapRows[0]?.computedAt ? snapRows[0].computedAt.getTime() : 0;
  const isFresh = computedAtMs > 0 && now - computedAtMs < SNAPSHOT_TTL_MS;

  if (!snapshotPayload || !isFresh) {
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

    snapshotPayload = {
      entries: rows.map((r, idx) => ({
        rank: idx + 1,
        userId: r.id,
        displayName: r.name,
        avatarUrl: r.image ?? null,
        brainCoins: r.brainCoins ?? 0,
        brainLevel: r.brainLevel ?? 1,
      })),
    };

    await db
      .insert(leaderboardSnapshots)
      .values({ kind: "coins", computedAt: new Date(), payload: snapshotPayload as Record<string, unknown> })
      .onConflictDoUpdate({
        target: leaderboardSnapshots.kind,
        set: { computedAt: new Date(), payload: snapshotPayload as Record<string, unknown> },
      });
  }

  const payloadEntriesRaw = (snapshotPayload as { entries?: unknown } | null)?.entries;
  const payloadEntries: Array<{
    rank: number;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    brainCoins: number;
    brainLevel: number;
  }> = Array.isArray(payloadEntriesRaw) ? (payloadEntriesRaw as typeof payloadEntries) : [];

  const medalFor = (rank: number) => (rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : null);

  const entries = payloadEntries.map((r) => ({
    rank: r.rank,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl ?? null,
    brainCoins: r.brainCoins ?? 0,
    brainLevel: r.brainLevel ?? 1,
    isMe: viewerUserId ? r.userId === viewerUserId : false,
    medal: medalFor(r.rank),
  }));

  let myRank: number | null = null;
  let myEntry: (typeof entries)[number] | null = null;

  try {
    if (!viewerUserId) throw new Error("unauthorized");
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
      .where(eq(user.id, viewerUserId))
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
        displayName: me.name,
        avatarUrl: me.image ?? null,
        brainCoins: meCoins,
        brainLevel: me.brainLevel ?? 1,
        isMe: true,
        medal: medalFor(myRank),
      };
    }
  } catch {
    myRank = null;
    myEntry = null;
  }

  res.status(200).json({ entries, myRank, myEntry });
}
