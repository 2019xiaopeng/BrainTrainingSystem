import { and, eq } from "drizzle-orm";
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

const clampInt = (n: unknown, fallback = 0) => (Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : fallback);
const clampFloat = (n: unknown, fallback = 0) => (Number.isFinite(Number(n)) ? Number(n) : fallback);

const computeScore = (accuracy: number, nLevel: number, totalRounds: number) =>
  Math.round((accuracy * nLevel * totalRounds) / 10);

const computeXp = (accuracy: number, nLevel: number, totalRounds: number) => {
  const nCoeff = 1 + (nLevel - 1) * 0.2;
  const modeCoeff = totalRounds >= 20 ? 1.5 : 1.0;
  return Math.round(20 * (nCoeff + modeCoeff) * (accuracy / 100));
};

const computeBrainLevel = (xp: number) => {
  if (xp >= 80000) return 7;
  if (xp >= 50000) return 6;
  if (xp >= 25000) return 5;
  if (xp >= 10000) return 4;
  if (xp >= 2500) return 3;
  if (xp >= 500) return 2;
  return 1;
};

const defaultUnlocks = () => ({
  numeric: { maxN: 1, rounds: [10] as number[] },
  spatial: { grids: [3] as number[], maxNByGrid: { "3": 1 } as Record<string, number> },
  mouse: { maxMice: 3, grids: [[4, 3]] as [number, number][], difficulties: ["easy"] as string[], maxRounds: 3 },
  house: { speeds: ["easy"] as string[], maxEvents: 5, maxRounds: 3 },
});

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

type NumericUnlocks = { maxN: number; rounds: number[] };
type SpatialUnlocks = { grids: number[]; maxNByGrid: Record<string, number> };
type MouseUnlocks = { maxMice: number; grids: [number, number][]; difficulties: string[]; maxRounds: number };
type HouseUnlocks = { speeds: string[]; maxEvents: number; maxRounds: number };
type Unlocks = ReturnType<typeof defaultUnlocks>;

const isUnlockedNumeric = (unlocks: NumericUnlocks, cfg: Record<string, unknown>) => {
  const maxN = clampInt(unlocks?.maxN, 1);
  const roundsAllowed: number[] = Array.isArray(unlocks?.rounds) ? unlocks.rounds.map((r) => clampInt(r)) : [10];
  const nLevel = clampInt(cfg.nLevel, 1);
  const rounds = clampInt(cfg.totalRounds, 10);
  return nLevel <= maxN && roundsAllowed.includes(rounds);
};

const isUnlockedSpatial = (unlocks: SpatialUnlocks, cfg: Record<string, unknown>) => {
  const grids: number[] = Array.isArray(unlocks?.grids) ? unlocks.grids.map((g) => clampInt(g)) : [3];
  const maxNByGrid: Record<string, number> = unlocks?.maxNByGrid && typeof unlocks.maxNByGrid === "object" ? unlocks.maxNByGrid : { "3": 1 };
  const gridSize = clampInt((cfg.gridSize ?? 3) as unknown, 3);
  const nLevel = clampInt(cfg.nLevel, 1);
  const cap = clampInt(maxNByGrid[String(gridSize)] ?? 1, 1);
  return grids.includes(gridSize) && nLevel <= cap;
};

const isUnlockedMouse = (unlocks: MouseUnlocks, details: Record<string, unknown> | null) => {
  const maxMice = clampInt(unlocks?.maxMice, 3);
  const maxRounds = clampInt(unlocks?.maxRounds, 3);
  const grids: [number, number][] = Array.isArray(unlocks?.grids) ? unlocks.grids : [[4, 3]];
  const difficulties: string[] = Array.isArray(unlocks?.difficulties) ? unlocks.difficulties : ["easy"];

  const numMice = clampInt(details?.numMice, 3);
  const cols = clampInt(details?.cols, 4);
  const rows = clampInt(details?.rows, 3);
  const difficulty = String(details?.difficulty ?? "easy");
  const totalRounds = clampInt(details?.totalRounds, 3);

  return (
    numMice <= maxMice &&
    totalRounds <= maxRounds &&
    difficulties.includes(difficulty) &&
    grids.some((g) => clampInt(g[0]) === cols && clampInt(g[1]) === rows)
  );
};

const isUnlockedHouse = (unlocks: HouseUnlocks, details: Record<string, unknown> | null) => {
  const speeds: string[] = Array.isArray(unlocks?.speeds) ? unlocks.speeds : ["easy"];
  const maxEvents = clampInt(unlocks?.maxEvents, 5);
  const maxRounds = clampInt(unlocks?.maxRounds, 3);

  const speed = String(details?.speed ?? "easy");
  const eventCount = clampInt(details?.eventCount, 5);
  const rounds = clampInt(details?.rounds, 3);

  return speeds.includes(speed) && eventCount <= maxEvents && rounds <= maxRounds;
};

const updateUnlocksAfterSession = (
  unlocks: Record<string, unknown>,
  mode: string,
  summary: Record<string, unknown>,
  details: Record<string, unknown> | null
) => {
  const acc = clampFloat(summary.accuracy, 0);
  if (acc < 90) return { next: unlocks, newlyUnlocked: [] as string[] };

  const newlyUnlocked: string[] = [];
  const next: Record<string, unknown> = { ...(unlocks ?? {}) };
  const cfg = isRecord(summary.config) ? summary.config : {};

  if (mode === "numeric") {
    const n = clampInt(cfg.nLevel, 1);
    const rounds = clampInt(cfg.totalRounds, 10);
    const maxN = clampInt(next.maxN, 1);
    const roundsList: number[] = Array.isArray(next.rounds) ? (next.rounds as unknown[]).map((r) => clampInt(r)) : [10];

    if (rounds === 10 && n >= maxN && maxN < 12) {
      next.maxN = Math.min(12, n + 1);
      newlyUnlocked.push(`numeric_n_${next.maxN}_10`);
    }
    if (rounds === 10 && !roundsList.includes(15)) {
      next.rounds = [...roundsList, 15].sort((a, b) => a - b);
      newlyUnlocked.push("numeric_rounds_15");
    }
    if (rounds === 15 && !roundsList.includes(20)) {
      next.rounds = [...roundsList, 20].sort((a, b) => a - b);
      newlyUnlocked.push("numeric_rounds_20");
    }
  }

  if (mode === "spatial") {
    const gridSize = clampInt((cfg.gridSize ?? 3) as unknown, 3);
    const n = clampInt(cfg.nLevel, 1);

    const grids: number[] = Array.isArray(next.grids) ? (next.grids as unknown[]).map((g) => clampInt(g)) : [3];
    const maxNByGridRaw = isRecord(next.maxNByGrid) ? next.maxNByGrid : { "3": 1 };
    const maxNByGrid: Record<string, number> = Object.fromEntries(
      Object.entries(maxNByGridRaw).map(([k, v]) => [k, clampInt(v, 1)])
    );

    const caps: Record<string, number> = { "3": 5, "4": 12, "5": 12 };
    const prevCap = clampInt(maxNByGrid[String(gridSize)] ?? 1, 1);
    const gridCap = caps[String(gridSize)] ?? 12;
    if (n >= prevCap && prevCap < gridCap) {
      maxNByGrid[String(gridSize)] = Math.min(gridCap, n + 1);
      next.maxNByGrid = maxNByGrid;
      newlyUnlocked.push(`spatial_${gridSize}x${gridSize}_n_${maxNByGrid[String(gridSize)]}`);
    }

    if (gridSize === 3 && n >= 3 && !grids.includes(4)) {
      next.grids = [...grids, 4].sort((a, b) => a - b);
      next.maxNByGrid = { ...maxNByGrid, "4": 1 };
      newlyUnlocked.push("spatial_grid_4");
    }

    if (gridSize === 4 && n >= 4 && !grids.includes(5)) {
      next.grids = [...grids, 5].sort((a, b) => a - b);
      next.maxNByGrid = { ...maxNByGrid, "5": 1 };
      newlyUnlocked.push("spatial_grid_5");
    }
  }

  if (mode === "mouse") {
    const numMice = clampInt(details?.numMice, 3);
    const difficulty = String(details?.difficulty ?? "easy");

    const maxMice = clampInt(next.maxMice, 3);
    const difficulties: string[] = Array.isArray(next.difficulties) ? next.difficulties : ["easy"];
    const maxRounds = clampInt(next.maxRounds, 3);

    if (difficulty === "easy" && !difficulties.includes("medium")) {
      next.difficulties = [...difficulties, "medium"];
      newlyUnlocked.push("mouse_difficulty_medium");
    }
    if (difficulty === "medium" && !difficulties.includes("hard")) {
      next.difficulties = [...difficulties, "hard"];
      newlyUnlocked.push("mouse_difficulty_hard");
    }
    if (difficulty === "hard" && !difficulties.includes("hell")) {
      next.difficulties = [...difficulties, "hell"];
      newlyUnlocked.push("mouse_difficulty_hell");
    }

    if (numMice >= maxMice && maxMice < 9) {
      next.maxMice = Math.min(9, numMice + 1);
      newlyUnlocked.push(`mouse_mice_${next.maxMice}`);
    }

    if (maxRounds < 5) {
      next.maxRounds = Math.min(5, maxRounds + 1);
      newlyUnlocked.push(`mouse_rounds_${next.maxRounds}`);
    }
  }

  if (mode === "house") {
    const speed = String(details?.speed ?? "easy");
    const eventCount = clampInt(details?.eventCount, 5);

    const speeds: string[] = Array.isArray(next.speeds) ? next.speeds : ["easy"];
    const maxEvents = clampInt(next.maxEvents, 5);
    const maxRounds = clampInt(next.maxRounds, 3);

    const speedOrder = ["easy", "normal", "fast"];
    const currentIdx = speedOrder.indexOf(speed);
    const maxSpeedIdx = Math.max(...speeds.map((s: string) => speedOrder.indexOf(s)).filter((i: number) => i >= 0));

    if (eventCount >= maxEvents && maxEvents < 20) {
      next.maxEvents = Math.min(20, maxEvents + 5);
      newlyUnlocked.push(`house_events_${next.maxEvents}`);
    }

    if (currentIdx >= 0 && currentIdx >= maxSpeedIdx && currentIdx < speedOrder.length - 1) {
      const nextSpeed = speedOrder[currentIdx + 1];
      if (!speeds.includes(nextSpeed)) {
        next.speeds = [...speeds, nextSpeed];
        newlyUnlocked.push(`house_speed_${nextSpeed}`);
      }
    }

    if (maxRounds < 5) {
      next.maxRounds = Math.min(5, maxRounds + 1);
      newlyUnlocked.push(`house_rounds_${next.maxRounds}`);
    }
  }

  return { next, newlyUnlocked };
};

export default async function handler(req: RequestLike, res: ResponseLike) {
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

  const summary = body.summary;
  const modeDetails = isRecord(body.modeDetails) ? body.modeDetails : {};
  if (!isRecord(summary)) {
    res.status(400).json({ error: "missing_summary" });
    return;
  }

  const config = isRecord(summary.config) ? summary.config : {};
  const mode = String(config.mode ?? "");
  if (!["numeric", "spatial", "mouse", "house"].includes(mode)) {
    res.status(400).json({ error: "invalid_mode" });
    return;
  }

  const accuracy = clampFloat(summary.accuracy, 0);
  const totalRounds = clampInt(summary.totalRounds ?? config.totalRounds ?? 0, 0);
  const nLevel = clampInt(config.nLevel ?? 1, 1);
  const avgReactionTimeMs = clampInt(summary.avgReactionTimeMs ?? 0, 0);

  const score = clampInt(summary.score, computeScore(accuracy, nLevel, Math.max(1, totalRounds)));
  const xpEarned = computeXp(accuracy, Math.max(1, nLevel), Math.max(1, totalRounds));

  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);

  try {
    const result = await db.transaction(async (tx) => {
      const uRows = await tx
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

      const u = uRows[0];
      if (!u) throw new Error("user_not_found");

      const isUnlimited = u.unlimitedEnergyUntil ? u.unlimitedEnergyUntil.getTime() > now.getTime() : false;
      const recovered = recoverEnergy(u.energyCurrent ?? ENERGY_MAX, u.energyLastUpdated ?? null);

      const energyBeforeConsume = isUnlimited ? ENERGY_MAX : recovered.current;
      if (!isUnlimited && energyBeforeConsume <= 0) {
        const err = new Error("insufficient_energy") as Error & { code?: string };
        err.code = "insufficient_energy";
        throw err;
      }

      const unlockRows = await tx
        .select({
          gameId: userUnlocks.gameId,
          unlockedParams: userUnlocks.unlockedParams,
        })
        .from(userUnlocks)
        .where(eq(userUnlocks.userId, sessionUser.id));

      const unlocks: Unlocks = defaultUnlocks();
      for (const row of unlockRows) {
        if (row.gameId === "numeric" && isRecord(row.unlockedParams)) unlocks.numeric = row.unlockedParams as Unlocks["numeric"];
        if (row.gameId === "spatial" && isRecord(row.unlockedParams)) unlocks.spatial = row.unlockedParams as Unlocks["spatial"];
        if (row.gameId === "mouse" && isRecord(row.unlockedParams)) unlocks.mouse = row.unlockedParams as Unlocks["mouse"];
        if (row.gameId === "house" && isRecord(row.unlockedParams)) unlocks.house = row.unlockedParams as Unlocks["house"];
      }

      const details =
        mode === "mouse"
          ? (isRecord(modeDetails.mouse) ? modeDetails.mouse : null)
          : mode === "house"
            ? (isRecord(modeDetails.house) ? modeDetails.house : null)
            : null;

      const isUnlocked =
        mode === "numeric"
          ? isUnlockedNumeric(unlocks.numeric, config)
          : mode === "spatial"
            ? isUnlockedSpatial(unlocks.spatial, config)
            : mode === "mouse"
              ? isUnlockedMouse(unlocks.mouse, details)
              : isUnlockedHouse(unlocks.house, details);

      if (!isUnlocked) {
        const err = new Error("locked") as Error & { code?: string };
        err.code = "locked";
        throw err;
      }

      const configSnapshot = {
        ...config,
        metrics: {
          totalRounds: clampInt(summary.totalRounds ?? config.totalRounds ?? 0, 0),
          correctCount: clampInt(summary.correctCount ?? 0, 0),
          incorrectCount: clampInt(summary.incorrectCount ?? 0, 0),
          missedCount: clampInt(summary.missedCount ?? 0, 0),
          durationMs: clampInt(summary.durationMs ?? 0, 0),
        },
        ...(mode === "mouse" ? { details } : {}),
        ...(mode === "house" ? { details } : {}),
      };

      await tx.insert(gameSessions).values({
        userId: sessionUser.id,
        gameMode: mode,
        nLevel,
        score,
        accuracy: Math.round(accuracy * 10) / 10,
        configSnapshot,
        avgReactionTime: avgReactionTimeMs > 0 ? avgReactionTimeMs : null,
        createdAt: now,
      });

      const xpBefore = clampInt(u.xp ?? 0, 0);
      const xpAfter = xpBefore + xpEarned;
      const brainLevelAfter = computeBrainLevel(xpAfter);

      const energyAfterConsume = isUnlimited ? ENERGY_MAX : Math.max(0, energyBeforeConsume - 1);

      await tx
        .update(user)
        .set({
          xp: xpAfter,
          brainLevel: brainLevelAfter,
          energyCurrent: energyAfterConsume,
          energyLastUpdated: isUnlimited ? u.energyLastUpdated : now,
        })
        .where(eq(user.id, sessionUser.id));

      const dailyRows = await tx
        .select({ id: dailyActivity.id, totalXp: dailyActivity.totalXp, sessionsCount: dailyActivity.sessionsCount })
        .from(dailyActivity)
        .where(and(eq(dailyActivity.userId, sessionUser.id), eq(dailyActivity.date, dateKey)))
        .limit(1);

      if (dailyRows[0]) {
        await tx
          .update(dailyActivity)
          .set({
            totalXp: clampInt(dailyRows[0].totalXp ?? 0, 0) + xpEarned,
            sessionsCount: clampInt(dailyRows[0].sessionsCount ?? 0, 0) + 1,
            updatedAt: now,
          })
          .where(eq(dailyActivity.id, dailyRows[0].id));
      } else {
        await tx.insert(dailyActivity).values({
          userId: sessionUser.id,
          date: dateKey,
          totalXp: xpEarned,
          sessionsCount: 1,
          updatedAt: now,
        });
      }

      const unlockUpdate =
        mode === "numeric"
          ? updateUnlocksAfterSession(unlocks.numeric, mode, summary, null)
          : mode === "spatial"
            ? updateUnlocksAfterSession(unlocks.spatial, mode, summary, null)
            : mode === "mouse"
              ? updateUnlocksAfterSession(unlocks.mouse, mode, summary, details)
              : updateUnlocksAfterSession(unlocks.house, mode, summary, details);

      if (unlockUpdate.newlyUnlocked.length > 0) {
        await tx
          .insert(userUnlocks)
          .values({
            userId: sessionUser.id,
            gameId: mode,
            unlockedParams: unlockUpdate.next,
          })
          .onConflictDoUpdate({
            target: [userUnlocks.userId, userUnlocks.gameId],
            set: { unlockedParams: unlockUpdate.next, updatedAt: now },
          });
      }

      if (mode === "numeric") unlocks.numeric = unlockUpdate.next as Unlocks["numeric"];
      if (mode === "spatial") unlocks.spatial = unlockUpdate.next as Unlocks["spatial"];
      if (mode === "mouse") unlocks.mouse = unlockUpdate.next as Unlocks["mouse"];
      if (mode === "house") unlocks.house = unlockUpdate.next as Unlocks["house"];

      return {
        xpEarned,
        xpAfter,
        brainLevelAfter,
        energy: {
          current: energyAfterConsume,
          max: ENERGY_MAX,
          lastUpdated: isUnlimited ? (u.energyLastUpdated ? u.energyLastUpdated.getTime() : now.getTime()) : now.getTime(),
          unlimitedUntil: u.unlimitedEnergyUntil ? u.unlimitedEnergyUntil.getTime() : 0,
        },
        unlocks,
        newlyUnlocked: unlockUpdate.newlyUnlocked,
      };
    });

    res.status(200).json(result);
  } catch (e: unknown) {
    const err = e as { code?: unknown; message?: unknown };
    const code = String(err?.code ?? err?.message ?? "unknown");
    if (code === "insufficient_energy") {
      res.status(400).json({ error: "insufficient_energy" });
      return;
    }
    if (code === "locked") {
      res.status(403).json({ error: "locked" });
      return;
    }
    if (code === "user_not_found") {
      res.status(404).json({ error: "user_not_found" });
      return;
    }
    res.status(500).json({ error: "server_error" });
  }
}
