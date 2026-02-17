/**
 * Consolidated user API handler.
 * Routes:
 *   GET  /api/user/profile                → user profile
 *   POST /api/user/checkin                 → daily check-in
 *   POST /api/user/display-name            → change display name
 *   POST /api/user/email/change-request    → request email change OTP
 *   POST /api/user/email/change-confirm    → confirm email change with OTP
 */
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../../server/_lib/db/index.js";
import {
  dailyActivity,
  gameSessions,
  user,
  userUnlocks,
  verification,
} from "../../server/_lib/db/schema/index.js";
import { getBanStatus } from "../../server/_lib/admin.js";
import { requireSessionUser } from "../../server/_lib/session.js";
import { sendResendEmail } from "../../server/_lib/email/resend.js";
import type { RequestLike, ResponseLike } from "../../server/_lib/http.js";
import { isRecord } from "../../server/_lib/http.js";

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

const getUrl = (req: RequestLike): string => {
  const raw = (req as unknown as { url?: unknown }).url;
  return typeof raw === "string" ? raw : "http://localhost/api/user";
};

const parseRoute = (req: RequestLike) => {
  const url = new URL(getUrl(req), "http://localhost");
  const segments = url.pathname.split("/").filter(Boolean);
  // segments: ["api", "user", "<action>", ...]
  const userIdx = segments.indexOf("user");
  const action = userIdx >= 0 ? segments[userIdx + 1] ?? "" : "";
  const sub = userIdx >= 0 ? segments[userIdx + 2] ?? "" : "";
  return { url, action, sub };
};

const parseBody = (req: RequestLike): unknown => {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return null;
};

const clampInt = (n: unknown, fallback = 0) =>
  Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : fallback;
const clampFloat = (n: unknown, fallback = 0) =>
  Number.isFinite(Number(n)) ? Number(n) : fallback;

/* ------------------------------------------------------------------ */
/*  PROFILE handler helpers                                            */
/* ------------------------------------------------------------------ */

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
  numeric: {
    maxN: 1,
    roundsByN: { "1": [5, 10] } as Record<string, number[]>,
  },
  spatial: {
    grids: [3],
    maxNByGrid: { "3": 1 } as Record<string, number>,
    roundsByN: { "1": [5, 10] as number[] } as Record<string, number[]>,
  },
  mouse: {
    maxMice: 3,
    grids: [[4, 3]],
    difficulties: ["easy"],
    maxRounds: 3,
  },
  house: {
    speeds: ["easy"],
    maxInitialPeople: 3,
    maxEvents: 6,
    maxRounds: 3,
  },
});
type Unlocks = ReturnType<typeof defaultUnlocks>;

const requiredMinRoundsForN = (n: number) => {
  const candidates = [5, 10, 15, 20, 25, 30];
  const target = n + 1;
  return candidates.find((r) => r >= target) ?? 30;
};

const normalizeNumericUnlocks = (
  raw: Record<string, unknown>
): Unlocks["numeric"] => {
  const maxN = Math.max(1, Math.min(12, clampInt(raw.maxN, 1)));

  if (isRecord(raw.roundsByN)) {
    const roundsByN: Record<string, number[]> = Object.fromEntries(
      Object.entries(raw.roundsByN).map(([k, v]) => [
        k,
        Array.isArray(v)
          ? (v as unknown[]).map((x) => clampInt(x)).filter((x) => x > 0)
          : [],
      ])
    );
    if (!roundsByN["1"] || roundsByN["1"].length === 0)
      roundsByN["1"] = [5, 10];
    for (let n = 1; n <= maxN; n += 1) {
      const key = String(n);
      const required = requiredMinRoundsForN(n);
      const current = roundsByN[key] ?? [];
      roundsByN[key] = Array.from(new Set([...current, required])).sort(
        (a, b) => a - b
      );
    }
    return { maxN, roundsByN };
  }

  const legacyRoundsRaw = raw.rounds;
  if (Array.isArray(legacyRoundsRaw)) {
    const legacyRounds = legacyRoundsRaw
      .map((x) => clampInt(x))
      .filter((x) => x > 0);
    const baseRounds = Array.from(new Set([5, 10, ...legacyRounds])).sort(
      (a, b) => a - b
    );
    const roundsByN: Record<string, number[]> = {};
    for (let n = 1; n <= maxN; n++) {
      const required = requiredMinRoundsForN(n);
      const initial = n === 1 ? baseRounds : baseRounds.filter((r) => r >= 10);
      const next = Array.from(new Set([...initial, required])).sort(
        (a, b) => a - b
      );
      roundsByN[String(n)] = next.length > 0 ? next : [required];
    }
    return { maxN, roundsByN };
  }

  return defaultUnlocks().numeric;
};

const normalizeSpatialUnlocks = (
  raw: Record<string, unknown>
): Unlocks["spatial"] => {
  const grids = Array.isArray(raw.grids)
    ? (raw.grids as unknown[]).map((g) => clampInt(g)).filter((g) => g > 0)
    : [3];
  const maxNByGridRaw = isRecord(raw.maxNByGrid) ? raw.maxNByGrid : { "3": 1 };
  const maxNByGrid: Record<string, number> = Object.fromEntries(
    Object.entries(maxNByGridRaw).map(([k, v]) => [
      k,
      Math.max(1, Math.min(12, clampInt(v, 1))),
    ])
  );

  const roundsByN: Record<string, number[]> = {};
  const inputRoundsByN = isRecord(raw.roundsByN)
    ? raw.roundsByN
    : { "1": [5, 10] };
  for (const [k, v] of Object.entries(inputRoundsByN)) {
    roundsByN[k] = Array.isArray(v)
      ? (v as unknown[]).map((x) => clampInt(x)).filter((x) => x > 0)
      : [];
  }
  if (!roundsByN["1"] || roundsByN["1"].length === 0)
    roundsByN["1"] = [5, 10];
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
    roundsByN[key] = Array.from(new Set([...current, required])).sort(
      (a, b) => a - b
    );
  }

  const uniqGrids =
    grids.length > 0
      ? Array.from(new Set(grids)).sort((a, b) => a - b)
      : [3];
  return { grids: uniqGrids, maxNByGrid, roundsByN };
};

const normalizeHouseUnlocks = (
  raw: Record<string, unknown>
): Unlocks["house"] => {
  const speedsRaw = Array.isArray(raw.speeds)
    ? (raw.speeds as unknown[]).map((s) => String(s))
    : ["easy"];
  const speeds = Array.from(new Set(speedsRaw));
  return {
    speeds: (speeds.length > 0 ? speeds : ["easy"]) as string[],
    maxInitialPeople: Math.max(
      3,
      Math.min(7, clampInt(raw.maxInitialPeople, 3))
    ),
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
  recentRows: Array<{
    gameMode: unknown;
    nLevel: unknown;
    accuracy: unknown;
    configSnapshot: unknown;
  }>,
  unlocks: Unlocks
) => {
  const milestones = new Set<string>();
  const meets = (
    mode: string,
    nAtLeast: number,
    predicate?: (row: { configSnapshot: unknown }) => boolean
  ) =>
    recentRows.some((r) => {
      if (String(r.gameMode ?? "") !== mode) return false;
      const acc = clampInt(r.accuracy, 0);
      if (acc < 90) return false;
      const n = clampInt(r.nLevel, 0);
      if (n < nAtLeast) return false;
      return predicate
        ? predicate({ configSnapshot: r.configSnapshot })
        : true;
    });

  if (meets("numeric", 2)) milestones.add("numeric_2back");
  if (meets("numeric", 3)) milestones.add("numeric_3back");
  if (meets("numeric", 5)) milestones.add("numeric_5back");
  if (meets("numeric", 7)) milestones.add("numeric_7back");

  if (
    meets(
      "spatial",
      2,
      ({ configSnapshot }) => extractGridSize(configSnapshot) === 3
    )
  )
    milestones.add("spatial_3x3_2back");
  if (
    meets(
      "spatial",
      2,
      ({ configSnapshot }) => extractGridSize(configSnapshot) === 4
    )
  )
    milestones.add("spatial_4x4_2back");
  if (
    meets(
      "spatial",
      3,
      ({ configSnapshot }) => extractGridSize(configSnapshot) === 5
    )
  )
    milestones.add("spatial_5x5_3back");
  if (
    Array.isArray(unlocks.spatial.grids) &&
    unlocks.spatial.grids.includes(5)
  )
    milestones.add("spatial_5x5");

  if (clampInt(unlocks.mouse.maxMice, 0) >= 4) milestones.add("mouse_4mice");
  if (clampInt(unlocks.mouse.maxMice, 0) >= 7) milestones.add("mouse_7mice");
  if (clampInt(unlocks.mouse.maxMice, 0) >= 9) milestones.add("mouse_9mice");

  if (
    meets("house", 1, ({ configSnapshot }) => {
      const d = extractHouseDetails(configSnapshot);
      return Boolean(d && d.speed === "normal" && d.eventCount >= 12);
    })
  )
    milestones.add("house_normal_12");
  if (
    meets("house", 1, ({ configSnapshot }) => {
      const d = extractHouseDetails(configSnapshot);
      return Boolean(d && d.speed === "fast" && d.eventCount >= 15);
    })
  )
    milestones.add("house_fast_15");

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
    return {
      memory: 0,
      focus: 0,
      math: 0,
      observation: 0,
      loadCapacity: 0,
      reaction: 0,
    };
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
  summary: {
    mode: string;
    nLevel: number;
    accuracy: number;
    avgReactionTimeMs: number;
  },
  lastSessions: Array<{ accuracy: number }>
): BrainStats => {
  const recent20 = lastSessions.slice(-20);
  const avgAccuracy =
    recent20.length > 0
      ? recent20.reduce((sum, s) => sum + s.accuracy, 0) / recent20.length
      : summary.accuracy;

  const mode = summary.mode;
  const n = summary.nLevel;
  const acc = summary.accuracy;
  const avgRT = summary.avgReactionTimeMs || 2000;

  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

  const memoryDelta =
    mode === "numeric" || mode === "spatial" || mode === "mouse"
      ? n * 8 * (acc / 100)
      : 0;
  const memory = clamp(Math.max(current.memory, memoryDelta));

  const focus = clamp(avgAccuracy);

  const math =
    mode === "numeric"
      ? clamp(Math.max(current.math, acc * 0.8 + n * 4))
      : current.math;

  const observation =
    mode === "spatial" || mode === "mouse"
      ? clamp(Math.max(current.observation, acc * 0.7 + n * 5))
      : current.observation;

  const loadCapacity =
    mode === "house" || n >= 3
      ? clamp(Math.max(current.loadCapacity, acc * 0.75 + n * 3))
      : current.loadCapacity;

  const reactionScore = clamp(((5000 - avgRT) / 3000) * 100);
  const reaction =
    current.reaction > 0
      ? clamp(current.reaction * 0.7 + reactionScore * 0.3)
      : reactionScore;

  return { memory, focus, math, observation, loadCapacity, reaction };
};

/* ------------------------------------------------------------------ */
/*  CHECK-IN handler helpers                                           */
/* ------------------------------------------------------------------ */

const computeBrainLevel = (xp: number) => {
  if (xp >= 80000) return 7;
  if (xp >= 50000) return 6;
  if (xp >= 25000) return 5;
  if (xp >= 10000) return 4;
  if (xp >= 2500) return 3;
  if (xp >= 500) return 2;
  return 1;
};

const getCheckinReward = (streak: number) => {
  const xp = 50;
  const coins = streak >= 7 ? 60 : streak >= 3 ? 20 : 10;
  return { xp, coins };
};

/* ------------------------------------------------------------------ */
/*  EMAIL handler helpers                                              */
/* ------------------------------------------------------------------ */

const normalizeEmail = (raw: unknown) =>
  String(raw ?? "")
    .trim()
    .toLowerCase();
const normalizeOtp = (raw: unknown) => String(raw ?? "").trim();

const isValidEmail = (email: string) => {
  if (!email || email.length > 254) return false;
  if (!email.includes("@")) return false;
  const [local, domain] = email.split("@");
  if (!local || !domain) return false;
  if (!domain.includes(".")) return false;
  return true;
};

const makeOtp = () =>
  String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");

/* ================================================================== */
/*  Sub-handlers                                                       */
/* ================================================================== */

/* ---- GET /api/user/profile ---- */
const handleProfile = async (req: RequestLike, res: ResponseLike) => {
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
  const isUnlimited = u.unlimitedEnergyUntil
    ? u.unlimitedEnergyUntil.getTime() > now.getTime()
    : false;
  const recovered = recoverEnergy(
    u.energyCurrent ?? ENERGY_MAX,
    u.energyLastUpdated ?? null
  );

  if (
    !isUnlimited &&
    (u.energyLastUpdated?.getTime() ?? 0) !== recovered.lastUpdated.getTime()
  ) {
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
    if (row.gameId === "numeric" && isRecord(row.unlockedParams))
      unlocks.numeric = normalizeNumericUnlocks(row.unlockedParams);
    if (row.gameId === "spatial" && isRecord(row.unlockedParams))
      unlocks.spatial = normalizeSpatialUnlocks(row.unlockedParams);
    if (row.gameId === "mouse" && isRecord(row.unlockedParams))
      unlocks.mouse = row.unlockedParams as Unlocks["mouse"];
    if (row.gameId === "house" && isRecord(row.unlockedParams))
      unlocks.house = normalizeHouseUnlocks(row.unlockedParams);
  }

  const wanted = ["numeric", "spatial", "mouse", "house"] as const;
  const missing = wanted.filter(
    (g) => !existingUnlockRows.some((r) => r.gameId === g)
  );

  if (missing.length > 0) {
    await db.transaction(async (tx) => {
      for (const g of missing) {
        const params =
          g === "numeric"
            ? unlocks.numeric
            : g === "spatial"
              ? unlocks.spatial
              : g === "mouse"
                ? unlocks.mouse
                : unlocks.house;
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
    .where(
      and(
        eq(dailyActivity.userId, sessionUser.id),
        gte(dailyActivity.date, startDateKey),
        lte(dailyActivity.date, endDateKey)
      )
    );

  const scoreAggRows = await db
    .select({
      totalScore: sql<number>`coalesce(sum(${gameSessions.score}), 0)`.mapWith(
        Number
      ),
      maxNLevel: sql<number>`coalesce(max(${gameSessions.nLevel}), 0)`.mapWith(
        Number
      ),
    })
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.userId, sessionUser.id),
        inArray(gameSessions.gameMode, ["numeric", "spatial"])
      )
    );

  const totalScore = scoreAggRows[0]?.totalScore ?? 0;
  const maxNLevelFromSessions = scoreAggRows[0]?.maxNLevel ?? 0;
  const maxNLevelFromUnlocks = Math.max(
    clampInt(unlocks.numeric.maxN, 1),
    Math.max(
      0,
      ...Object.values(unlocks.spatial.maxNByGrid ?? {}).map((v) =>
        clampInt(v, 0)
      )
    )
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
      const metrics =
        isRecord(snapshot) && isRecord(snapshot.metrics)
          ? snapshot.metrics
          : null;
      const totalRounds = metrics ? clampInt(metrics.totalRounds, 0) : 0;
      return {
        timestamp: row.createdAt ? row.createdAt.getTime() : Date.now(),
        nLevel: clampInt(row.nLevel ?? 0, 0),
        accuracy: clampInt(row.accuracy ?? 0, 0),
        score: clampInt(row.score ?? 0, 0),
        totalRounds,
        mode: String(row.gameMode ?? "numeric"),
        ...(row.avgReactionTime
          ? { avgReactionTimeMs: clampInt(row.avgReactionTime, 0) }
          : {}),
      };
    });

  const completedMilestones = computeCompletedMilestones(recentRows, unlocks);

  let brainStats = normalizeBrainStats(u.brainStats);
  const recentForStats = sessionHistory.slice(-20);
  if (recentForStats.length > 0) {
    const rolling: Array<{ accuracy: number }> = [];
    brainStats = {
      memory: 0,
      focus: 0,
      math: 0,
      observation: 0,
      loadCapacity: 0,
      reaction: 0,
    };
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
    await db
      .update(user)
      .set({ brainStats })
      .where(eq(user.id, sessionUser.id));
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
      unlimitedUntil: u.unlimitedEnergyUntil
        ? u.unlimitedEnergyUntil.getTime()
        : 0,
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
};

/* ---- POST /api/user/checkin ---- */
const handleCheckin = async (req: RequestLike, res: ResponseLike) => {
  if (req.method !== "POST") {
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

  const ban = await getBanStatus(sessionUser.id);
  if (ban.banned) {
    res.status(403).json({ error: "banned" });
    return;
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(todayKey);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  const dayBeforeYesterday = new Date(todayKey);
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
  const dayBeforeYesterdayKey = dayBeforeYesterday.toISOString().slice(0, 10);

  const result = await db.transaction(async (tx) => {
    const rows = await tx
      .select({
        xp: user.xp,
        brainLevel: user.brainLevel,
        brainCoins: user.brainCoins,
        checkInLastDate: user.checkInLastDate,
        checkInStreak: user.checkInStreak,
        inventory: user.inventory,
      })
      .from(user)
      .where(eq(user.id, sessionUser.id))
      .limit(1);

    const row = rows[0];
    if (!row) return { error: "user_not_found" as const };

    const last = row.checkInLastDate ? String(row.checkInLastDate) : null;
    if (last === todayKey) {
      return {
        alreadyCheckedIn: true,
        xpAfter: row.xp ?? 0,
        brainLevelAfter: row.brainLevel ?? 1,
        brainCoinsAfter: row.brainCoins ?? 0,
        checkIn: {
          lastCheckInDate: todayKey,
          consecutiveDays: row.checkInStreak ?? 0,
        },
        reward: { xp: 0, coins: 0 },
      };
    }

    const prevStreak = row.checkInStreak ?? 0;
    const inventoryRaw =
      row.inventory && typeof row.inventory === "object"
        ? (row.inventory as Record<string, unknown>)
        : {};
    const streakSaverCount = Number(inventoryRaw["streak_saver"] ?? 0) || 0;
    const canUseStreakSaver =
      last === dayBeforeYesterdayKey && streakSaverCount > 0;
    const newStreak =
      last === yesterdayKey || canUseStreakSaver ? prevStreak + 1 : 1;
    const reward = getCheckinReward(newStreak);

    const xpBefore = row.xp ?? 0;
    const coinsBefore = row.brainCoins ?? 0;
    const xpAfter = xpBefore + reward.xp;
    const brainCoinsAfter = coinsBefore + reward.coins;
    const brainLevelAfter = computeBrainLevel(xpAfter);
    const nextInventory = canUseStreakSaver
      ? { ...inventoryRaw, streak_saver: Math.max(0, streakSaverCount - 1) }
      : inventoryRaw;

    await tx
      .update(user)
      .set({
        xp: xpAfter,
        brainLevel: brainLevelAfter,
        brainCoins: brainCoinsAfter,
        checkInLastDate: todayKey,
        checkInStreak: newStreak,
        inventory: nextInventory,
      })
      .where(eq(user.id, sessionUser.id));

    return {
      alreadyCheckedIn: false,
      xpAfter,
      brainLevelAfter,
      brainCoinsAfter,
      checkIn: { lastCheckInDate: todayKey, consecutiveDays: newStreak },
      reward,
    };
  });

  if ("error" in result && result.error === "user_not_found") {
    res.status(404).json({ error: "user_not_found" });
    return;
  }

  res.status(200).json(result);
};

/* ---- POST /api/user/display-name ---- */
const handleDisplayName = async (req: RequestLike, res: ResponseLike) => {
  if (req.method !== "POST") {
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

  const body = parseBody(req);
  if (!isRecord(body)) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const displayName = String(body.displayName ?? "").trim();
  if (displayName.length < 2 || displayName.length > 20) {
    res.status(400).json({ error: "invalid_display_name" });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      const rows = await tx
        .select({ name: user.name, inventory: user.inventory })
        .from(user)
        .where(eq(user.id, sessionUser.id))
        .limit(1);

      const u = rows[0];
      if (!u) throw new Error("user_not_found");

      const inventoryRaw =
        u.inventory && typeof u.inventory === "object"
          ? (u.inventory as Record<string, unknown>)
          : {};
      const renameCount = Number(inventoryRaw.rename_card) || 0;
      if (renameCount <= 0) {
        const err = new Error("no_rename_card") as Error & { code?: string };
        err.code = "no_rename_card";
        throw err;
      }

      const nextInventory = {
        ...Object.fromEntries(
          Object.entries(inventoryRaw).map(([k, v]) => [k, Number(v) || 0])
        ),
      };
      nextInventory.rename_card = Math.max(0, renameCount - 1);

      await tx
        .update(user)
        .set({
          name: displayName,
          inventory: nextInventory,
          updatedAt: new Date(),
        })
        .where(eq(user.id, sessionUser.id));

      return { displayName, inventory: nextInventory };
    });

    res.status(200).json(result);
  } catch (e: unknown) {
    const err = e as { code?: unknown; message?: unknown };
    const code = String(err?.code ?? err?.message ?? "unknown");
    if (code === "no_rename_card") {
      res.status(400).json({ error: "no_rename_card" });
      return;
    }
    if (code === "user_not_found") {
      res.status(404).json({ error: "user_not_found" });
      return;
    }
    res.status(500).json({ error: "server_error" });
  }
};

/* ---- POST /api/user/email/change-request ---- */
const handleEmailChangeRequest = async (
  req: RequestLike,
  res: ResponseLike
) => {
  const sessionUser = await requireSessionUser(req);

  const body = isRecord(req.body) ? req.body : {};
  const nextEmail = normalizeEmail(body.email);
  if (!isValidEmail(nextEmail)) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }

  const currentRows = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, sessionUser.id))
    .limit(1);
  const currentEmail = normalizeEmail(currentRows[0]?.email ?? "");
  if (currentEmail && currentEmail === nextEmail) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }

  const existsRows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, nextEmail))
    .limit(1);
  if (existsRows[0]?.id) {
    res.status(409).json({ error: "email_in_use" });
    return;
  }

  const otp = makeOtp();
  const id = `email_change:${sessionUser.id}:${nextEmail}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db
    .insert(verification)
    .values({ id, identifier: id, value: otp, expiresAt })
    .onConflictDoUpdate({
      target: verification.id,
      set: { identifier: id, value: otp, expiresAt },
    });

  await sendResendEmail({
    to: nextEmail,
    subject: "BrainTrainSystem 更改邮箱验证码",
    text: `你的更改邮箱验证码：${otp}\n\n该验证码 10 分钟内有效。若非本人操作，请忽略此邮件。`,
  });

  res.status(200).json({ ok: true });
};

/* ---- POST /api/user/email/change-confirm ---- */
const handleEmailChangeConfirm = async (
  req: RequestLike,
  res: ResponseLike
) => {
  const sessionUser = await requireSessionUser(req);

  const body = isRecord(req.body) ? req.body : {};
  const nextEmail = normalizeEmail(body.email);
  const otp = normalizeOtp(body.otp);

  if (!isValidEmail(nextEmail)) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }
  if (!/^\d{6}$/.test(otp)) {
    res.status(400).json({ error: "invalid_otp" });
    return;
  }

  const existsRows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, nextEmail))
    .limit(1);
  if (existsRows[0]?.id) {
    res.status(409).json({ error: "email_in_use" });
    return;
  }

  const id = `email_change:${sessionUser.id}:${nextEmail}`;
  const verRows = await db
    .select({
      value: verification.value,
      expiresAt: verification.expiresAt,
    })
    .from(verification)
    .where(and(eq(verification.id, id), eq(verification.identifier, id)))
    .limit(1);

  const row = verRows[0];
  if (!row) {
    res.status(400).json({ error: "invalid_otp" });
    return;
  }

  if (row.expiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: "expired_otp" });
    return;
  }

  if (String(row.value) !== otp) {
    res.status(400).json({ error: "invalid_otp" });
    return;
  }

  await db
    .update(user)
    .set({ email: nextEmail, emailVerified: true })
    .where(eq(user.id, sessionUser.id));
  await db.delete(verification).where(eq(verification.id, id));

  res.status(200).json({ email: nextEmail, emailVerified: true });
};

/* ================================================================== */
/*  Main Router                                                        */
/* ================================================================== */

export default async function handler(req: RequestLike, res: ResponseLike) {
  const { action, sub } = parseRoute(req);

  if (action === "profile") {
    await handleProfile(req, res);
    return;
  }

  if (action === "checkin") {
    await handleCheckin(req, res);
    return;
  }

  if (action === "display-name") {
    await handleDisplayName(req, res);
    return;
  }

  if (action === "email") {
    if (req.method !== "POST") {
      res.status(405).json({ error: "method_not_allowed" });
      return;
    }
    try {
      if (sub === "change-request") {
        await handleEmailChangeRequest(req, res);
        return;
      }
      if (sub === "change-confirm") {
        await handleEmailChangeConfirm(req, res);
        return;
      }
      res.status(404).json({ error: "not_found" });
    } catch {
      res.status(401).json({ error: "unauthorized" });
    }
    return;
  }

  res.status(404).json({ error: "not_found" });
}
