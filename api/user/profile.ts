import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../_lib/db/index.js";
import { dailyActivity, gameSessions, user, userUnlocks } from "../_lib/db/schema/index.js";
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
  spatial: { grids: [3], maxNByGrid: { "3": 1 } as Record<string, number>, roundsByN: { "1": [5, 10] as number[] } as Record<string, number[]> },
  mouse: { maxMice: 3, grids: [[4, 3]], difficulties: ["easy"], maxRounds: 3 },
  house: { speeds: ["easy"], maxInitialPeople: 3, maxEvents: 6, maxRounds: 3 },
});
type Unlocks = ReturnType<typeof defaultUnlocks>;

const clampInt = (n: unknown, fallback = 0) => (Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : fallback);
const clampFloat = (n: unknown, fallback = 0) => (Number.isFinite(Number(n)) ? Number(n) : fallback);

const requiredMinRoundsForN = (n: number) => {
  const candidates = [5, 10, 15, 20, 25, 30];
  const target = n + 1;
  return candidates.find((r) => r >= target) ?? 30;
};

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
    for (let n = 1; n <= maxN; n += 1) {
      const key = String(n);
      const required = requiredMinRoundsForN(n);
      const current = roundsByN[key] ?? [];
      roundsByN[key] = Array.from(new Set([...current, required])).sort((a, b) => a - b);
    }
    return { maxN, roundsByN };
  }

  const legacyRoundsRaw = raw.rounds;
  if (Array.isArray(legacyRoundsRaw)) {
    const legacyRounds = legacyRoundsRaw.map((x) => clampInt(x)).filter((x) => x > 0);
    const baseRounds = Array.from(new Set([5, 10, ...legacyRounds])).sort((a, b) => a - b);
    const roundsByN: Record<string, number[]> = {};
    for (let n = 1; n <= maxN; n++) {
      const required = requiredMinRoundsForN(n);
      const initial = n === 1 ? baseRounds : baseRounds.filter((r) => r >= 10);
      const next = Array.from(new Set([...initial, required])).sort((a, b) => a - b);
      roundsByN[String(n)] = next.length > 0 ? next : [required];
    }
    return { maxN, roundsByN };
  }

  return defaultUnlocks().numeric;
};

const normalizeSpatialUnlocks = (raw: Record<string, unknown>): Unlocks["spatial"] => {
  const grids = Array.isArray(raw.grids) ? (raw.grids as unknown[]).map((g) => clampInt(g)).filter((g) => g > 0) : [3];
  const maxNByGridRaw = isRecord(raw.maxNByGrid) ? raw.maxNByGrid : { "3": 1 };
  const maxNByGrid: Record<string, number> = Object.fromEntries(
    Object.entries(maxNByGridRaw).map(([k, v]) => [k, Math.max(1, Math.min(12, clampInt(v, 1)))])
  );

  const roundsByN: Record<string, number[]> = {};
  const inputRoundsByN = isRecord(raw.roundsByN) ? raw.roundsByN : { "1": [5, 10] };
  for (const [k, v] of Object.entries(inputRoundsByN)) {
    roundsByN[k] = Array.isArray(v) ? (v as unknown[]).map((x) => clampInt(x)).filter((x) => x > 0) : [];
  }
  if (!roundsByN["1"] || roundsByN["1"].length === 0) roundsByN["1"] = [5, 10];
  const maxNFromRounds = Math.max(
    1,
    ...Object.keys(roundsByN)
      .map((k) => clampInt(k, 1))
      .filter((x) => x > 0)
  );
  for (let n = 1; n <= maxNFromRounds; n += 1) {
    const key = String(n);
    const required = requiredMinRoundsForN(n);
    const current = roundsByN[key] ?? [];
    roundsByN[key] = Array.from(new Set([...current, required])).sort((a, b) => a - b);
  }

  const uniqGrids = grids.length > 0 ? Array.from(new Set(grids)).sort((a, b) => a - b) : [3];
  return { grids: uniqGrids, maxNByGrid, roundsByN };
};

const normalizeHouseUnlocks = (raw: Record<string, unknown>): Unlocks["house"] => {
  const speedsRaw = Array.isArray(raw.speeds) ? (raw.speeds as unknown[]).map((s) => String(s)) : ["easy"];
  const speeds = Array.from(new Set(speedsRaw));
  return {
    speeds: (speeds.length > 0 ? speeds : ["easy"]) as string[],
    maxInitialPeople: Math.max(3, Math.min(7, clampInt(raw.maxInitialPeople, 3))),
    maxEvents: Math.max(6, Math.min(24, clampInt(raw.maxEvents, 6))),
    maxRounds: Math.max(3, Math.min(5, clampInt(raw.maxRounds, 3))),
  } as Unlocks["house"];
};

const extractGridSize = (snapshot: unknown) => {
  if (!isRecord(snapshot)) return 3;
  return clampInt(snapshot.gridSize, 3);
};

const extractHouseDetails = (snapshot: unknown) => {
  if (!isRecord(snapshot)) return null;
  const details = isRecord(snapshot.details) ? snapshot.details : null;
  if (!details) return null;
  return {
    speed: String(details.speed ?? "easy"),
    eventCount: clampInt(details.eventCount, 0),
  };
};

const computeCompletedMilestones = (
  recentRows: Array<{ gameMode: unknown; nLevel: unknown; accuracy: unknown; configSnapshot: unknown }>,
  unlocks: Unlocks
) => {
  const milestones = new Set<string>();
  const meets = (mode: string, nAtLeast: number, predicate?: (row: { configSnapshot: unknown }) => boolean) =>
    recentRows.some((r) => {
      if (String(r.gameMode ?? "") !== mode) return false;
      const acc = clampInt(r.accuracy, 0);
      if (acc < 90) return false;
      const n = clampInt(r.nLevel, 0);
      if (n < nAtLeast) return false;
      return predicate ? predicate({ configSnapshot: r.configSnapshot }) : true;
    });

  if (meets("numeric", 2)) milestones.add("numeric_2back");
  if (meets("numeric", 3)) milestones.add("numeric_3back");
  if (meets("numeric", 5)) milestones.add("numeric_5back");
  if (meets("numeric", 7)) milestones.add("numeric_7back");

  if (meets("spatial", 2, ({ configSnapshot }) => extractGridSize(configSnapshot) === 3)) milestones.add("spatial_3x3_2back");
  if (meets("spatial", 2, ({ configSnapshot }) => extractGridSize(configSnapshot) === 4)) milestones.add("spatial_4x4_2back");
  if (meets("spatial", 3, ({ configSnapshot }) => extractGridSize(configSnapshot) === 5)) milestones.add("spatial_5x5_3back");
  if (Array.isArray(unlocks.spatial.grids) && unlocks.spatial.grids.includes(5)) milestones.add("spatial_5x5");

  if (clampInt(unlocks.mouse.maxMice, 0) >= 4) milestones.add("mouse_4mice");
  if (clampInt(unlocks.mouse.maxMice, 0) >= 7) milestones.add("mouse_7mice");
  if (clampInt(unlocks.mouse.maxMice, 0) >= 9) milestones.add("mouse_9mice");

  if (meets("house", 1, ({ configSnapshot }) => {
    const d = extractHouseDetails(configSnapshot);
    return Boolean(d && d.speed === "normal" && d.eventCount >= 12);
  })) milestones.add("house_normal_12");
  if (meets("house", 1, ({ configSnapshot }) => {
    const d = extractHouseDetails(configSnapshot);
    return Boolean(d && d.speed === "fast" && d.eventCount >= 15);
  })) milestones.add("house_fast_15");

  return Array.from(milestones).sort();
};

type BrainStats = {
  memory: number;
  focus: number;
  math: number;
  observation: number;
  loadCapacity: number;
  reaction: number;
};

const normalizeBrainStats = (raw: unknown): BrainStats => {
  if (!isRecord(raw)) {
    return { memory: 0, focus: 0, math: 0, observation: 0, loadCapacity: 0, reaction: 0 };
  }
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  return {
    memory: clamp(clampFloat(raw.memory, 0)),
    focus: clamp(clampFloat(raw.focus, 0)),
    math: clamp(clampFloat(raw.math, 0)),
    observation: clamp(clampFloat(raw.observation, 0)),
    loadCapacity: clamp(clampFloat(raw.loadCapacity, 0)),
    reaction: clamp(clampFloat(raw.reaction, 0)),
  };
};

const computeBrainStats = (
  current: BrainStats,
  summary: { mode: string; nLevel: number; accuracy: number; avgReactionTimeMs: number },
  lastSessions: Array<{ accuracy: number }>
): BrainStats => {
  const recent20 = lastSessions.slice(-20);
  const avgAccuracy =
    recent20.length > 0 ? recent20.reduce((sum, s) => sum + s.accuracy, 0) / recent20.length : summary.accuracy;

  const mode = summary.mode;
  const n = summary.nLevel;
  const acc = summary.accuracy;
  const avgRT = summary.avgReactionTimeMs || 2000;

  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

  const memoryDelta = mode === "numeric" || mode === "spatial" || mode === "mouse" ? n * 8 * (acc / 100) : 0;
  const memory = clamp(Math.max(current.memory, memoryDelta));

  const focus = clamp(avgAccuracy);

  const math = mode === "numeric" ? clamp(Math.max(current.math, acc * 0.8 + n * 4)) : current.math;

  const observation =
    mode === "spatial" || mode === "mouse" ? clamp(Math.max(current.observation, acc * 0.7 + n * 5)) : current.observation;

  const loadCapacity =
    mode === "house" || n >= 3 ? clamp(Math.max(current.loadCapacity, acc * 0.75 + n * 3)) : current.loadCapacity;

  const reactionScore = clamp(((5000 - avgRT) / 3000) * 100);
  const reaction = current.reaction > 0 ? clamp(current.reaction * 0.7 + reactionScore * 0.3) : reactionScore;

  return { memory, focus, math, observation, loadCapacity, reaction };
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
      ownedItems: user.ownedItems,
      inventory: user.inventory,
      energyCurrent: user.energyCurrent,
      energyLastUpdated: user.energyLastUpdated,
      unlimitedEnergyUntil: user.unlimitedEnergyUntil,
      checkInLastDate: user.checkInLastDate,
      checkInStreak: user.checkInStreak,
      brainStats: user.brainStats,
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
    if (row.gameId === "spatial" && isRecord(row.unlockedParams)) unlocks.spatial = normalizeSpatialUnlocks(row.unlockedParams);
    if (row.gameId === "mouse" && isRecord(row.unlockedParams)) unlocks.mouse = row.unlockedParams as Unlocks["mouse"];
    if (row.gameId === "house" && isRecord(row.unlockedParams)) unlocks.house = normalizeHouseUnlocks(row.unlockedParams);
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

  const year = now.getUTCFullYear();
  const startDateKey = `${year}-01-01`;
  const endDateKey = `${year}-12-31`;

  const activityRows = await db
    .select({
      date: dailyActivity.date,
      totalXp: dailyActivity.totalXp,
      sessionsCount: dailyActivity.sessionsCount,
    })
    .from(dailyActivity)
    .where(and(eq(dailyActivity.userId, sessionUser.id), gte(dailyActivity.date, startDateKey), lte(dailyActivity.date, endDateKey)));

  const scoreAggRows = await db
    .select({
      totalScore: sql<number>`coalesce(sum(${gameSessions.score}), 0)`.mapWith(Number),
      maxNLevel: sql<number>`coalesce(max(${gameSessions.nLevel}), 0)`.mapWith(Number),
    })
    .from(gameSessions)
    .where(and(eq(gameSessions.userId, sessionUser.id), inArray(gameSessions.gameMode, ["numeric", "spatial"])));

  const totalScore = scoreAggRows[0]?.totalScore ?? 0;
  const maxNLevelFromSessions = scoreAggRows[0]?.maxNLevel ?? 0;
  const maxNLevelFromUnlocks = Math.max(
    clampInt(unlocks.numeric.maxN, 1),
    Math.max(0, ...Object.values(unlocks.spatial.maxNByGrid ?? {}).map((v) => clampInt(v, 0)))
  );

  const maxNLevel = Math.max(maxNLevelFromSessions, maxNLevelFromUnlocks);
  const daysStreak = u.checkInStreak ?? 0;

  const recentRows = await db
    .select({
      createdAt: gameSessions.createdAt,
      gameMode: gameSessions.gameMode,
      nLevel: gameSessions.nLevel,
      score: gameSessions.score,
      accuracy: gameSessions.accuracy,
      avgReactionTime: gameSessions.avgReactionTime,
      configSnapshot: gameSessions.configSnapshot,
    })
    .from(gameSessions)
    .where(eq(gameSessions.userId, sessionUser.id))
    .orderBy(desc(gameSessions.createdAt))
    .limit(50);

  const sessionHistory = recentRows
    .slice()
    .reverse()
    .map((row) => {
      const snapshot = row.configSnapshot as unknown;
      const metrics = isRecord(snapshot) && isRecord(snapshot.metrics) ? snapshot.metrics : null;
      const totalRounds = metrics ? clampInt(metrics.totalRounds, 0) : 0;
      return {
        timestamp: row.createdAt ? row.createdAt.getTime() : Date.now(),
        nLevel: clampInt(row.nLevel ?? 0, 0),
        accuracy: clampInt(row.accuracy ?? 0, 0),
        score: clampInt(row.score ?? 0, 0),
        totalRounds,
        mode: String(row.gameMode ?? "numeric"),
        ...(row.avgReactionTime ? { avgReactionTimeMs: clampInt(row.avgReactionTime, 0) } : {}),
      };
    });

  const completedMilestones = computeCompletedMilestones(recentRows, unlocks);

  let brainStats = normalizeBrainStats(u.brainStats);
  const recentForStats = sessionHistory.slice(-20);
  if (recentForStats.length > 0) {
    const rolling: Array<{ accuracy: number }> = [];
    brainStats = { memory: 0, focus: 0, math: 0, observation: 0, loadCapacity: 0, reaction: 0 };
    for (const s of recentForStats) {
      rolling.push({ accuracy: s.accuracy });
      brainStats = computeBrainStats(
        brainStats,
        {
          mode: s.mode,
          nLevel: s.nLevel,
          accuracy: s.accuracy,
          avgReactionTimeMs: s.avgReactionTimeMs ?? 2000,
        },
        rolling
      );
    }
  }

  const existingStats = normalizeBrainStats(u.brainStats);
  const changed =
    existingStats.memory !== brainStats.memory ||
    existingStats.focus !== brainStats.focus ||
    existingStats.math !== brainStats.math ||
    existingStats.observation !== brainStats.observation ||
    existingStats.loadCapacity !== brainStats.loadCapacity ||
    existingStats.reaction !== brainStats.reaction;
  if (changed) {
    await db.update(user).set({ brainStats }).where(eq(user.id, sessionUser.id));
  }

  res.status(200).json({
    xp: u.xp ?? 0,
    brainLevel: u.brainLevel ?? 1,
    brainCoins: u.brainCoins ?? 0,
    ownedItems: Array.isArray(u.ownedItems) ? u.ownedItems : [],
    inventory: isRecord(u.inventory) ? u.inventory : {},
    totalScore,
    maxNLevel,
    daysStreak,
    brainStats,
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
    completedMilestones,
    dailyActivity: activityRows.map((row) => ({
      date: String(row.date),
      totalXp: row.totalXp ?? 0,
      sessionsCount: row.sessionsCount ?? 0,
    })),
    sessionHistory,
  });
}
