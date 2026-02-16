import type { GameUnlocks, MouseDifficultyLevel, HouseSpeed } from "../../types/game";
import type { CampaignLevel } from "../../types/campaign";

const clampInt = (n: unknown, fallback = 0) => (Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : fallback);

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

