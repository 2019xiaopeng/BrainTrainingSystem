import type { GameUnlocks, MouseDifficultyLevel, HouseSpeed } from "../../types/game";
import type { CampaignLevel, CampaignLevelResult } from "../../types/campaign";

const clampInt = (n: unknown, fallback = 0) => (Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : fallback);

/**
 * Check if a campaign level is reachable based purely on progression
 * (NOT config unlock tree — campaign progress determines availability).
 */
export const isLevelReachable = (
  level: CampaignLevel,
  allLevels: CampaignLevel[],
  results: CampaignLevelResult[],
): boolean => {
  const resultsMap = new Map(results.map((r) => [r.levelId, r]));
  // First level of first episode is always reachable
  if (level.orderInEpisode === 1) {
    // Check if the episode itself is unlocked
    const epLevels = allLevels.filter((l) => l.episodeId < level.episodeId);
    // Episode 1 always unlocked; others need all prior episode levels cleared with >=1 star
    if (level.episodeId === 1) return true;
    return epLevels.every((l) => (resultsMap.get(l.id)?.bestStars ?? 0) >= 1);
  }
  // For subsequent levels in the same episode: previous level must be cleared
  const prevLevel = allLevels.find((l) => l.episodeId === level.episodeId && l.orderInEpisode === level.orderInEpisode - 1);
  if (!prevLevel) return false;
  return (resultsMap.get(prevLevel.id)?.bestStars ?? 0) >= 1;
};

/**
 * Check if an episode is unlocked for navigation.
 * Episode 1 is always unlocked. Episode N requires all levels in episode N-1
 * to have 3 stars.
 */
export const isEpisodeUnlocked = (
  episodeId: number,
  episodes: { id: number; order: number }[],
  allLevels: CampaignLevel[],
  results: CampaignLevelResult[],
): boolean => {
  if (episodeId <= 1) return true;
  const resultsMap = new Map(results.map((r) => [r.levelId, r]));
  const ep = episodes.find((e) => e.id === episodeId);
  if (!ep) return false;
  // Find the previous episode by order
  const prevEp = episodes.find((e) => e.order === ep.order - 1);
  if (!prevEp) return false;
  const prevLevels = allLevels.filter((l) => l.episodeId === prevEp.id);
  if (prevLevels.length === 0) return false;
  return prevLevels.every((l) => (resultsMap.get(l.id)?.bestStars ?? 0) >= 3);
};

/**
 * Derive GameUnlocks from campaign progress.
 * Whatever configs the user has beaten (>=1 star) in campaign become available
 * in free training. Starts with minimum defaults (N=1, 3x3, easy, etc.).
 */
export const deriveUnlocksFromCampaign = (
  allLevels: CampaignLevel[],
  results: CampaignLevelResult[],
): GameUnlocks => {
  const clearedIds = new Set(results.filter((r) => r.bestStars >= 1).map((r) => r.levelId));

  // Start with base defaults
  const unlocks: GameUnlocks = {
    numeric: { maxN: 1, roundsByN: { "1": [10] } },
    spatial: { grids: [3], maxNByGrid: { "3": 1 }, roundsByN: { "1": [10] } },
    mouse: { maxMice: 3, grids: [[4, 3]], difficulties: ["easy"], maxRounds: 3 },
    house: { speeds: ["easy"], maxInitialPeople: 3, maxEvents: 6, maxRounds: 3 },
  };

  for (const level of allLevels) {
    if (!clearedIds.has(level.id)) continue;
    const cfg = (level.config ?? {}) as Record<string, unknown>;

    if (level.gameMode === "numeric") {
      const n = clampInt(cfg.nLevel, 1);
      const rounds = clampInt(cfg.rounds, 10);
      unlocks.numeric.maxN = Math.max(unlocks.numeric.maxN, n);
      const key = String(n);
      if (!unlocks.numeric.roundsByN[key]) unlocks.numeric.roundsByN[key] = [];
      if (!unlocks.numeric.roundsByN[key].includes(rounds)) unlocks.numeric.roundsByN[key].push(rounds);
    }

    if (level.gameMode === "spatial") {
      const gridSize = clampInt(cfg.gridSize, 3);
      const n = clampInt(cfg.nLevel, 1);
      const rounds = clampInt(cfg.rounds, 10);
      if (!unlocks.spatial.grids.includes(gridSize)) unlocks.spatial.grids.push(gridSize);
      const gKey = String(gridSize);
      unlocks.spatial.maxNByGrid[gKey] = Math.max(unlocks.spatial.maxNByGrid[gKey] ?? 0, n);
      const nKey = String(n);
      if (!unlocks.spatial.roundsByN[nKey]) unlocks.spatial.roundsByN[nKey] = [];
      if (!unlocks.spatial.roundsByN[nKey].includes(rounds)) unlocks.spatial.roundsByN[nKey].push(rounds);
    }

    if (level.gameMode === "mouse") {
      const count = clampInt(cfg.count, 3);
      const rounds = clampInt(cfg.rounds, 3);
      const difficulty = String(cfg.difficulty ?? "easy") as MouseDifficultyLevel;
      const gridRaw = cfg.grid;
      const grid = Array.isArray(gridRaw) ? ([clampInt(gridRaw[0], 4), clampInt(gridRaw[1], 3)] as [number, number]) : ([4, 3] as [number, number]);
      unlocks.mouse.maxMice = Math.max(unlocks.mouse.maxMice, count);
      unlocks.mouse.maxRounds = Math.max(unlocks.mouse.maxRounds, rounds);
      if (!unlocks.mouse.difficulties.includes(difficulty)) unlocks.mouse.difficulties.push(difficulty);
      if (!unlocks.mouse.grids.some((g) => g[0] === grid[0] && g[1] === grid[1])) {
        unlocks.mouse.grids.push(grid);
      }
    }

    if (level.gameMode === "house") {
      const speed = String(cfg.speed ?? "easy") as HouseSpeed;
      const initialPeople = clampInt(cfg.initialPeople, 3);
      const eventCount = clampInt(cfg.eventCount, 6);
      const rounds = clampInt(cfg.rounds, 3);
      if (!unlocks.house.speeds.includes(speed)) unlocks.house.speeds.push(speed);
      unlocks.house.maxInitialPeople = Math.max(unlocks.house.maxInitialPeople, initialPeople);
      unlocks.house.maxEvents = Math.max(unlocks.house.maxEvents, eventCount);
      unlocks.house.maxRounds = Math.max(unlocks.house.maxRounds, rounds);
    }
  }

  return unlocks;
};

/** @deprecated Use isLevelReachable instead. Kept for backward compat. */
export const isLevelConfigUnlocked = (unlocks: GameUnlocks | null, level: CampaignLevel): boolean => {
  if (!unlocks) return true;

  const mode = level.gameMode;
  const cfg = level.config ?? {};

  if (mode === "numeric") {
    const n = clampInt((cfg as Record<string, unknown>).nLevel, 1);
    const rounds = clampInt((cfg as Record<string, unknown>).rounds, 10);
    const allowed = unlocks.numeric.roundsByN[String(n)] ?? [];
    return n <= unlocks.numeric.maxN && allowed.includes(rounds);
  }

  if (mode === "spatial") {
    const gridSize = clampInt((cfg as Record<string, unknown>).gridSize, 3);
    const n = clampInt((cfg as Record<string, unknown>).nLevel, 1);
    const rounds = clampInt((cfg as Record<string, unknown>).rounds, 10);
    const cap = unlocks.spatial.maxNByGrid[String(gridSize)] ?? 1;
    const allowed = unlocks.spatial.roundsByN[String(n)] ?? [];
    return unlocks.spatial.grids.includes(gridSize) && n <= cap && allowed.includes(rounds);
  }

  if (mode === "mouse") {
    const count = clampInt((cfg as Record<string, unknown>).count, 3);
    const rounds = clampInt((cfg as Record<string, unknown>).rounds, 3);
    const difficulty = String((cfg as Record<string, unknown>).difficulty ?? "easy") as MouseDifficultyLevel;
    const gridRaw = (cfg as Record<string, unknown>).grid;
    const grid = Array.isArray(gridRaw) ? [clampInt(gridRaw[0], 4), clampInt(gridRaw[1], 3)] : [4, 3];
    return (
      count <= unlocks.mouse.maxMice &&
      rounds <= unlocks.mouse.maxRounds &&
      unlocks.mouse.difficulties.includes(difficulty) &&
      unlocks.mouse.grids.some((g) => g[0] === grid[0] && g[1] === grid[1])
    );
  }

  if (mode === "house") {
    const speed = String((cfg as Record<string, unknown>).speed ?? "easy") as HouseSpeed;
    const initialPeople = clampInt((cfg as Record<string, unknown>).initialPeople, 3);
    const eventCount = clampInt((cfg as Record<string, unknown>).eventCount, 6);
    const rounds = clampInt((cfg as Record<string, unknown>).rounds, 3);
    return (
      unlocks.house.speeds.includes(speed) &&
      initialPeople <= unlocks.house.maxInitialPeople &&
      eventCount <= unlocks.house.maxEvents &&
      rounds <= unlocks.house.maxRounds
    );
  }

  return true;
};

