import { eq } from "drizzle-orm";
import { db } from "../_lib/db";
import { user, userUnlocks } from "../_lib/db/schema";
import { requireSessionUser } from "../_lib/session";
import type { RequestLike, ResponseLike } from "../_lib/http";
import { isRecord } from "../_lib/http";

const ENERGY_MAX = 5;
const ENERGY_RECOVERY_INTERVAL_MS = 4 * 60 * 60 * 1000;

const recoverEnergy = (current: number, lastUpdated: Date | null) => {
  const now = Date.now();
  const last = lastUpdated ? lastUpdated.getTime() : now;
  const elapsed = Math.max(0, now - last);
  const recovered = Math.floor(elapsed / ENERGY_RECOVERY_INTERVAL_MS);
  if (recovered <= 0) {
    return { current, lastUpdated: new Date(last) };
  }
  const newCurrent = Math.min(ENERGY_MAX, current + recovered);
  const remainder = elapsed % ENERGY_RECOVERY_INTERVAL_MS;
  return { current: newCurrent, lastUpdated: new Date(now - remainder) };
};

const defaultUnlocks = () => ({
  numeric: { maxN: 1, rounds: [10] },
  spatial: { grids: [3], maxNByGrid: { "3": 1 } },
  mouse: { maxMice: 3, grids: [[4, 3]], difficulties: ["easy"], maxRounds: 3 },
  house: { speeds: ["easy"], maxEvents: 5, maxRounds: 3 },
});
type Unlocks = ReturnType<typeof defaultUnlocks>;

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  let sessionUser;
  try {
    sessionUser = await requireSessionUser(req);
  } catch {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const rows = await db
    .select({
      xp: user.xp,
      brainLevel: user.brainLevel,
      energyCurrent: user.energyCurrent,
      energyLastUpdated: user.energyLastUpdated,
      unlimitedEnergyUntil: user.unlimitedEnergyUntil,
    })
    .from(user)
    .where(eq(user.id, sessionUser.id))
    .limit(1);

  const u = rows[0];
  if (!u) {
    res.status(404).json({ error: "user_not_found" });
    return;
  }

  const now = new Date();
  const isUnlimited = u.unlimitedEnergyUntil ? u.unlimitedEnergyUntil.getTime() > now.getTime() : false;
  const recovered = recoverEnergy(u.energyCurrent ?? ENERGY_MAX, u.energyLastUpdated ?? null);

  if (!isUnlimited && (u.energyLastUpdated?.getTime() ?? 0) !== recovered.lastUpdated.getTime()) {
    await db
      .update(user)
      .set({
        energyCurrent: recovered.current,
        energyLastUpdated: recovered.lastUpdated,
      })
      .where(eq(user.id, sessionUser.id));
  }

  const existingUnlockRows = await db
    .select({
      gameId: userUnlocks.gameId,
      unlockedParams: userUnlocks.unlockedParams,
    })
    .from(userUnlocks)
    .where(eq(userUnlocks.userId, sessionUser.id));

  const unlocks: Unlocks = defaultUnlocks();
  for (const row of existingUnlockRows) {
    if (row.gameId === "numeric" && isRecord(row.unlockedParams)) unlocks.numeric = row.unlockedParams as Unlocks["numeric"];
    if (row.gameId === "spatial" && isRecord(row.unlockedParams)) unlocks.spatial = row.unlockedParams as Unlocks["spatial"];
    if (row.gameId === "mouse" && isRecord(row.unlockedParams)) unlocks.mouse = row.unlockedParams as Unlocks["mouse"];
    if (row.gameId === "house" && isRecord(row.unlockedParams)) unlocks.house = row.unlockedParams as Unlocks["house"];
  }

  const wanted = ["numeric", "spatial", "mouse", "house"] as const;
  const missing = wanted.filter((g) => !existingUnlockRows.some((r) => r.gameId === g));

  if (missing.length > 0) {
    await db.transaction(async (tx) => {
      for (const g of missing) {
        const params =
          g === "numeric" ? unlocks.numeric :
          g === "spatial" ? unlocks.spatial :
          g === "mouse" ? unlocks.mouse :
          unlocks.house;
        await tx.insert(userUnlocks).values({
          userId: sessionUser.id,
          gameId: g,
          unlockedParams: params,
        });
      }
    });
  }

  res.status(200).json({
    xp: u.xp ?? 0,
    brainLevel: u.brainLevel ?? 1,
    energy: {
      current: isUnlimited ? ENERGY_MAX : recovered.current,
      max: ENERGY_MAX,
      lastUpdated: recovered.lastUpdated.getTime(),
      unlimitedUntil: u.unlimitedEnergyUntil ? u.unlimitedEnergyUntil.getTime() : 0,
    },
    unlocks,
  });
}
