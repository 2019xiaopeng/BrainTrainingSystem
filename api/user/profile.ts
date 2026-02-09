import { eq } from "drizzle-orm";
import { db } from "../_lib/db/index.js";
import { user, userUnlocks } from "../_lib/db/schema/index.js";
import { requireSessionUser } from "../_lib/session.js";
import type { RequestLike, ResponseLike } from "../_lib/http.js";
import { isRecord } from "../_lib/http.js";

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
  numeric: { maxN: 1, roundsByN: { "1": [5, 10] } as Record<string, number[]> },
  spatial: { grids: [3], maxNByGrid: { "3": 1 } },
  mouse: { maxMice: 3, grids: [[4, 3]], difficulties: ["easy"], maxRounds: 3 },
  house: { speeds: ["easy"], maxEvents: 5, maxRounds: 3 },
});
type Unlocks = ReturnType<typeof defaultUnlocks>;

const clampInt = (n: unknown, fallback = 0) => (Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : fallback);

const normalizeNumericUnlocks = (raw: Record<string, unknown>): Unlocks["numeric"] => {
  const maxN = Math.max(1, Math.min(12, clampInt(raw.maxN, 1)));

  if (isRecord(raw.roundsByN)) {
    const roundsByN: Record<string, number[]> = Object.fromEntries(
      Object.entries(raw.roundsByN).map(([k, v]) => [
        k,
        Array.isArray(v) ? (v as unknown[]).map((x) => clampInt(x)).filter((x) => x > 0) : [],
      ])
    );
    if (!roundsByN["1"] || roundsByN["1"].length === 0) roundsByN["1"] = [5, 10];
    return { maxN, roundsByN };
  }

  const legacyRoundsRaw = raw.rounds;
  if (Array.isArray(legacyRoundsRaw)) {
    const legacyRounds = legacyRoundsRaw.map((x) => clampInt(x)).filter((x) => x > 0);
    const baseRounds = Array.from(new Set([5, 10, ...legacyRounds])).sort((a, b) => a - b);
    const roundsByN: Record<string, number[]> = {};
    for (let n = 1; n <= maxN; n++) {
      roundsByN[String(n)] = n === 1 ? baseRounds : baseRounds.filter((r) => r >= 10);
      if (roundsByN[String(n)].length === 0) roundsByN[String(n)] = [10];
    }
    return { maxN, roundsByN };
  }

  return defaultUnlocks().numeric;
};

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
      brainCoins: user.brainCoins,
      energyCurrent: user.energyCurrent,
      energyLastUpdated: user.energyLastUpdated,
      unlimitedEnergyUntil: user.unlimitedEnergyUntil,
      checkInLastDate: user.checkInLastDate,
      checkInStreak: user.checkInStreak,
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
    if (row.gameId === "numeric" && isRecord(row.unlockedParams)) unlocks.numeric = normalizeNumericUnlocks(row.unlockedParams);
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
    brainCoins: u.brainCoins ?? 0,
    energy: {
      current: isUnlimited ? ENERGY_MAX : recovered.current,
      max: ENERGY_MAX,
      lastUpdated: recovered.lastUpdated.getTime(),
      unlimitedUntil: u.unlimitedEnergyUntil ? u.unlimitedEnergyUntil.getTime() : 0,
    },
    checkIn: {
      lastCheckInDate: u.checkInLastDate ? String(u.checkInLastDate) : null,
      consecutiveDays: u.checkInStreak ?? 0,
    },
    unlocks,
  });
}
