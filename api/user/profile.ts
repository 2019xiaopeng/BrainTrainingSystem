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
  spatial: { grids: [3], maxNByGrid: { "3": 1 } },
  mouse: { maxMice: 3, grids: [[4, 3]], difficulties: ["easy"], maxRounds: 3 },
  house: { speeds: ["easy"], maxEvents: 5, maxRounds: 3 },
});
type Unlocks = ReturnType<typeof defaultUnlocks>;

const clampInt = (n: unknown, fallback = 0) => (Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : fallback);
const clampFloat = (n: unknown, fallback = 0) => (Number.isFinite(Number(n)) ? Number(n) : fallback);

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

  if (isRecord(u.brainStats) === false || Object.keys(u.brainStats as object).length === 0) {
    await db.update(user).set({ brainStats }).where(eq(user.id, sessionUser.id));
  }

  res.status(200).json({
    xp: u.xp ?? 0,
    brainLevel: u.brainLevel ?? 1,
    brainCoins: u.brainCoins ?? 0,
    ownedItems: Array.isArray(u.ownedItems) ? u.ownedItems : [],
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
    dailyActivity: activityRows.map((row) => ({
      date: String(row.date),
      totalXp: row.totalXp ?? 0,
      sessionsCount: row.sessionsCount ?? 0,
    })),
    sessionHistory,
  });
}
