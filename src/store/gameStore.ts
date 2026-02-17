// ============================================================
// Brain Flow - Global Application Store (Zustand)
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppView, NBackConfig, SessionSummary, UserProfile, SessionHistoryEntry, GameConfigs, GameMode, BrainStats, AuthProfile, EnergyState, CheckInState, GameUnlocks, DailyActivityEntry, MouseDifficultyLevel, HouseSpeed } from '../types/game';
import { DEFAULT_CONFIG, ENERGY_MAX, calculateRecoveredEnergy, getBrainRank, getCheckInReward, STORE_PRODUCTS } from '../types/game';
import { updateGuestCampaignAfterSession, computeStars, readGuestCampaignProgress } from '../lib/campaign/guestProgress';

const ENERGY_STORAGE_KEY_GUEST = 'brain-flow-energy:guest';
const ENERGY_STORAGE_KEY_USER_PREFIX = 'brain-flow-energy:user:';
const AUTH_INTENT_KEY = 'brain-flow-auth-intent';

const getUserEnergyKey = (userId: string) => `${ENERGY_STORAGE_KEY_USER_PREFIX}${userId}`;

const readEnergyFromStorage = (key: string): EnergyState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EnergyState;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.current !== 'number') return null;
    if (typeof parsed.max !== 'number') return null;
    if (typeof parsed.lastUpdated !== 'number') return null;
    if (typeof parsed.unlimitedUntil !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeEnergyToStorage = (key: string, energy: EnergyState) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(energy));
  } catch {
    return;
  }
};

const isEnergyState = (v: unknown): v is EnergyState => {
  if (!v || typeof v !== 'object') return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.current === 'number' &&
    typeof e.max === 'number' &&
    typeof e.lastUpdated === 'number' &&
    typeof e.unlimitedUntil === 'number'
  );
};

const mergeEnergyState = (local: EnergyState, remote: unknown): EnergyState => {
  if (!isEnergyState(remote)) return local;
  const r = remote;
  if (r.unlimitedUntil > local.unlimitedUntil) return r;
  if (r.lastUpdated > local.lastUpdated) return r;
  if (r.lastUpdated === local.lastUpdated) return r.current < local.current ? r : local;
  return r.current < local.current ? { ...local, current: r.current } : local;
};

const isCheckInState = (v: unknown): v is CheckInState => {
  if (!v || typeof v !== 'object') return false;
  const c = v as Record<string, unknown>;
  return (
    (typeof c.lastCheckInDate === 'string' || c.lastCheckInDate === null) &&
    typeof c.consecutiveDays === 'number'
  );
};

const readAndClearAuthIntent = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const intent = window.localStorage.getItem(AUTH_INTENT_KEY);
    window.localStorage.removeItem(AUTH_INTENT_KEY);
    return intent;
  } catch {
    return null;
  }
};

interface GameStore {
  /** Which screen the user is on */
  currentView: AppView;
  /** The config to use for the next game */
  nextConfig: NBackConfig;
  /** The most recent session summary (for the result screen) */
  lastSummary: SessionSummary | null;
  /** Server-confirmed unlock IDs from the most recent session */
  lastUnlocks: string[];
  /** Rewards (optimistic first, then reconciled by server) for the most recent session */
  lastRewards: {
    xpEarned: number;
    unlockBonusCoins: number;
    dailyPerfectBonus: number;
    dailyFirstWinBonus: number;
    campaignStarBonus: number;
    brainCoinsEarned: number;
    brainCoinsAfter: number;
    xpAfter: number;
    brainLevelBefore: number;
    brainLevelAfter: number;
    levelUp: boolean;
    energyConsumed: number;
    energyRefunded: number;
  } | null;
  /** Simplified history of last 50 sessions */
  sessionHistory: SessionHistoryEntry[];
  /** User's persistent profile */
  userProfile: UserProfile;
  /** User's saved game configurations */
  gameConfigs: GameConfigs;
  /** Cloud-sourced unlocks (skill trees) for each mode */
  cloudUnlocks: GameUnlocks | null;
  /** Frontend-tracked unlocks used for instant gating (optimistic, reconciled by server) */
  optimisticUnlocks: GameUnlocks | null;
  /** Cloud-sourced daily activity for heatmap */
  cloudDailyActivity: DailyActivityEntry[] | null;
  /** Pending cloud uploads for sessions */
  pendingSessionUploads: { id: string; body: unknown; attempts: number; nextRetryAt: number }[];
  /** Active campaign run context (set when starting from campaign map) */
  activeCampaignRun: null | {
    levelId: number;
    episodeId: number;
    orderInEpisode: number;
    minAccuracy: number;
    nextEpisodeId: number;
    nextLevelId: number;
  };
  /** Last server-confirmed campaign update (used for UI refresh) */
  lastCampaignUpdate: unknown | null;

  // Actions
  setView: (view: AppView) => void;
  setAuthProfile: (auth: AuthProfile) => void;
  setCloudUnlocks: (unlocks: GameUnlocks | null) => void;
  setCloudDailyActivity: (activity: DailyActivityEntry[] | null) => void;
  setNextConfig: (config: Partial<NBackConfig>) => void;
  saveSession: (summary: SessionSummary) => void;
  kickoffSessionSync: () => void;
  setActiveCampaignRun: (run: GameStore["activeCampaignRun"]) => void;
  updateGameConfig: (mode: GameMode, config: Partial<GameConfigs[GameMode]>) => void;
  goToGame: () => void;
  goToResult: (summary: SessionSummary) => void;
  goHome: () => void;

  // Economy actions
  recalculateEnergy: () => void;
  consumeEnergy: () => boolean;
  addEnergy: (amount: number) => void;
  performCheckIn: () => Promise<{ xpGained: number; coinsGained: number } | null>;
  purchaseProduct: (productId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  addBrainCoins: (amount: number) => void;
}

const calculateScore = (summary: SessionSummary): number => {
  // Score formula: (accuracy * nLevel * totalRounds) / 10
  // Example: 90% accuracy, 3-Back, 20 rounds = (90 * 3 * 20) / 10 = 540 points
  const { accuracy, config, totalRounds } = summary;
  return Math.round((accuracy * config.nLevel * totalRounds) / 10);
};

const calculateXpEarned = (summary: SessionSummary): number => {
  const accuracy = Number.isFinite(Number(summary.accuracy)) ? Number(summary.accuracy) : 0;
  const nLevel = Number.isFinite(Number(summary.config?.nLevel)) ? Number(summary.config.nLevel) : 1;
  const totalRounds = Number.isFinite(Number(summary.totalRounds)) ? Number(summary.totalRounds) : 1;
  const nCoeff = 1 + (Math.max(1, nLevel) - 1) * 0.2;
  const modeCoeff = totalRounds >= 20 ? 1.5 : 1.0;
  return Math.round(20 * (nCoeff + modeCoeff) * (Math.max(0, Math.min(100, accuracy)) / 100));
};

const calculateBrainCoinsEarned = (score: number) => {
  const COINS_PER_SCORE = 0.05;
  const MAX_COINS_PER_SESSION = 20;
  return Math.max(0, Math.min(MAX_COINS_PER_SESSION, Math.round(score * COINS_PER_SCORE)));
};

const defaultUnlocks = (): GameUnlocks => ({
  numeric: { maxN: 1, roundsByN: { "1": [5, 10] } },
  spatial: { grids: [3], maxNByGrid: { "3": 1 }, roundsByN: { "1": [5, 10] } },
  mouse: { maxMice: 3, grids: [[4, 3]], difficulties: ["easy"], maxRounds: 3 },
  house: { speeds: ["easy"], maxInitialPeople: 3, maxEvents: 6, maxRounds: 3 },
});

const clampInt = (n: unknown, fallback = 0) => (Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : fallback);
const clampFloat = (n: unknown, fallback = 0) => (Number.isFinite(Number(n)) ? Number(n) : fallback);

const requiredMinRoundsForN = (n: number) => {
  const candidates = [5, 10, 15, 20, 25, 30];
  const target = n + 1;
  return candidates.find((r) => r >= target) ?? 30;
};

const normalizeNumericUnlocks = (raw: GameUnlocks["numeric"]): GameUnlocks["numeric"] => {
  const maxN = Math.max(1, Math.min(12, clampInt(raw?.maxN, 1)));
  const roundsByN: Record<string, number[]> = {};
  const input = raw?.roundsByN && typeof raw.roundsByN === "object" ? raw.roundsByN : { "1": [5, 10] };
  for (const [k, v] of Object.entries(input)) {
    roundsByN[k] = Array.isArray(v) ? (v as unknown[]).map((x) => clampInt(x)).filter((x) => x > 0) : [];
  }
  if (!roundsByN["1"] || roundsByN["1"].length === 0) roundsByN["1"] = [5, 10];
  for (let n = 1; n <= maxN; n += 1) {
    const key = String(n);
    const required = requiredMinRoundsForN(n);
    const current = roundsByN[key] ?? [];
    const next = Array.from(new Set([...current, required])).sort((a, b) => a - b);
    roundsByN[key] = next.length > 0 ? next : [required];
  }
  return { maxN, roundsByN };
};

const normalizeSpatialUnlocks = (raw: GameUnlocks["spatial"]): GameUnlocks["spatial"] => {
  const grids = Array.isArray(raw?.grids)
    ? (raw.grids as unknown[]).map((g) => clampInt(g)).filter((g) => g > 0)
    : [3];
  const maxNByGridRaw = raw?.maxNByGrid && typeof raw.maxNByGrid === "object" ? raw.maxNByGrid : { "3": 1 };
  const maxNByGrid: Record<string, number> = Object.fromEntries(
    Object.entries(maxNByGridRaw).map(([k, v]) => [k, Math.max(1, Math.min(12, clampInt(v, 1)))])
  );

  const roundsByN: Record<string, number[]> = {};
  const inputRoundsByN =
    raw?.roundsByN && typeof raw.roundsByN === "object" ? raw.roundsByN : { "1": [5, 10] };
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
    const next = Array.from(new Set([...current, required])).sort((a, b) => a - b);
    roundsByN[key] = next.length > 0 ? next : [required];
  }

  const uniqGrids = grids.length > 0 ? Array.from(new Set(grids)).sort((a, b) => a - b) : [3];
  return { grids: uniqGrids, maxNByGrid, roundsByN };
};

const normalizeHouseUnlocks = (raw: GameUnlocks["house"]): GameUnlocks["house"] => {
  const speedsRaw = Array.isArray(raw?.speeds) ? raw.speeds : ["easy"];
  const speeds = Array.from(new Set(speedsRaw.map((s) => String(s)))) as HouseSpeed[];
  return {
    speeds: speeds.length > 0 ? speeds : (["easy"] as HouseSpeed[]),
    maxInitialPeople: Math.max(3, Math.min(7, clampInt((raw as { maxInitialPeople?: unknown } | undefined)?.maxInitialPeople, 3))),
    maxEvents: Math.max(6, Math.min(24, clampInt(raw?.maxEvents, 6))),
    maxRounds: Math.max(3, Math.min(5, clampInt(raw?.maxRounds, 3))),
  };
};

const updateUnlocksAfterSession = (current: GameUnlocks, summary: SessionSummary, modeDetails: Record<string, unknown>) => {
  const mode = String(summary.config?.mode ?? "");
  const acc = clampFloat(summary.accuracy, 0);
  if (acc < 90) return { next: current, newlyUnlocked: [] as string[] };

  const newlyUnlocked: string[] = [];
  const next: GameUnlocks = {
    numeric: normalizeNumericUnlocks(current.numeric),
    spatial: normalizeSpatialUnlocks(current.spatial),
    mouse: { ...current.mouse },
    house: normalizeHouseUnlocks(current.house),
  };

  if (mode === "numeric") {
    const n = clampInt(summary.config?.nLevel, 1);
    const rounds = clampInt(summary.totalRounds ?? summary.config?.totalRounds ?? 10, 10);
    const roundsByN = { ...(next.numeric.roundsByN ?? {}) };

    const key = String(n);
    const currentRoundsList = roundsByN[key] ?? (n === 1 ? [5, 10] : [10]);
    const nextRounds = rounds + 5;
    if (nextRounds <= 30 && nextRounds % 5 === 0 && !currentRoundsList.includes(nextRounds)) {
      roundsByN[key] = [...currentRoundsList, nextRounds].sort((a, b) => a - b);
      next.numeric.roundsByN = roundsByN;
      newlyUnlocked.push(`numeric_n_${n}_r_${nextRounds}`);
    }

    if (rounds === 10 && n === next.numeric.maxN && next.numeric.maxN < 12) {
      const nextN = next.numeric.maxN + 1;
      const nextKey = String(nextN);
      if (!roundsByN[nextKey]) {
        const required = requiredMinRoundsForN(nextN);
        roundsByN[nextKey] = required === 5 ? [5, 10] : [required];
      }
      next.numeric.roundsByN = roundsByN;
      next.numeric.maxN = nextN;
      const unlockedRounds = roundsByN[nextKey] ?? [];
      const first = unlockedRounds[0] ?? requiredMinRoundsForN(nextN);
      newlyUnlocked.push(`numeric_n_${nextN}_r_${first}`);
    }
  }

  if (mode === "spatial") {
    const gridSize = clampInt((summary.config as unknown as Record<string, unknown>)?.gridSize ?? 3, 3);
    const n = clampInt(summary.config?.nLevel, 1);
    const rounds = clampInt(summary.totalRounds ?? summary.config?.totalRounds ?? 10, 10);

    const grids: number[] = Array.isArray(next.spatial.grids) ? next.spatial.grids : [3];
    const maxNByGrid: Record<string, number> =
      next.spatial.maxNByGrid && typeof next.spatial.maxNByGrid === "object" ? { ...next.spatial.maxNByGrid } : { "3": 1 };
    const roundsByN = { ...(next.spatial.roundsByN ?? { "1": [5, 10] }) };

    const caps: Record<string, number> = { "3": 5, "4": 12, "5": 12 };
    const prevCap = clampInt(maxNByGrid[String(gridSize)] ?? 1, 1);
    const gridCap = caps[String(gridSize)] ?? 12;
    if (n >= prevCap && prevCap < gridCap) {
      maxNByGrid[String(gridSize)] = Math.min(gridCap, n + 1);
      next.spatial.maxNByGrid = maxNByGrid;
      newlyUnlocked.push(`spatial_${gridSize}x${gridSize}_n_${maxNByGrid[String(gridSize)]}`);
      const newKey = String(maxNByGrid[String(gridSize)]);
      if (!roundsByN[newKey]) {
        const required = requiredMinRoundsForN(clampInt(newKey, 1));
        roundsByN[newKey] = required === 5 ? [5, 10] : [required];
      }
    }

    const key = String(n);
    const currentRoundsList = roundsByN[key] ?? (n === 1 ? [5, 10] : [10]);
    const nextRounds = rounds + 5;
    if (nextRounds <= 30 && nextRounds % 5 === 0 && !currentRoundsList.includes(nextRounds)) {
      roundsByN[key] = [...currentRoundsList, nextRounds].sort((a, b) => a - b);
      newlyUnlocked.push(`spatial_n_${n}_r_${nextRounds}`);
    }
    next.spatial.roundsByN = roundsByN;

    if (gridSize === 3 && n >= 3 && !grids.includes(4)) {
      next.spatial.grids = [...grids, 4].sort((a, b) => a - b);
      next.spatial.maxNByGrid = { ...maxNByGrid, "4": 1 };
      newlyUnlocked.push("spatial_grid_4");
    }

    if (gridSize === 4 && n >= 4 && !grids.includes(5)) {
      next.spatial.grids = [...grids, 5].sort((a, b) => a - b);
      next.spatial.maxNByGrid = { ...maxNByGrid, "5": 1 };
      newlyUnlocked.push("spatial_grid_5");
    }
  }

  if (mode === "mouse") {
    const details = (modeDetails.mouse as Record<string, unknown>) ?? {};
    const numMice = clampInt(details?.numMice, 3);
    const difficulty = String(details?.difficulty ?? "easy");

    const difficulties: MouseDifficultyLevel[] = Array.isArray(next.mouse.difficulties)
      ? next.mouse.difficulties
      : ["easy"];
    const maxMice = clampInt(next.mouse.maxMice, 3);
    const maxRounds = clampInt(next.mouse.maxRounds, 3);

    if (difficulty === "easy" && !difficulties.includes("medium")) {
      next.mouse.difficulties = [...difficulties, "medium"] as MouseDifficultyLevel[];
      newlyUnlocked.push("mouse_difficulty_medium");
    }
    if (difficulty === "medium" && !difficulties.includes("hard")) {
      next.mouse.difficulties = [...difficulties, "hard"] as MouseDifficultyLevel[];
      newlyUnlocked.push("mouse_difficulty_hard");
    }
    if (difficulty === "hard" && !difficulties.includes("hell")) {
      next.mouse.difficulties = [...difficulties, "hell"] as MouseDifficultyLevel[];
      newlyUnlocked.push("mouse_difficulty_hell");
    }

    if (numMice >= maxMice && maxMice < 9) {
      next.mouse.maxMice = Math.min(9, numMice + 1);
      newlyUnlocked.push(`mouse_mice_${next.mouse.maxMice}`);
    }

    const grids: [number, number][] = Array.isArray(next.mouse.grids) ? next.mouse.grids : [[4, 3]];
    const hasGrid = (cols: number, rows: number) => grids.some((g) => clampInt(g[0], 0) === cols && clampInt(g[1], 0) === rows);
    if (next.mouse.maxMice >= 5 && !hasGrid(5, 4)) {
      next.mouse.grids = [...grids, [5, 4]];
      newlyUnlocked.push("mouse_grid_5x4");
    }
    if (next.mouse.maxMice >= 7 && !hasGrid(6, 5)) {
      next.mouse.grids = [...(next.mouse.grids ?? grids), [6, 5]];
      newlyUnlocked.push("mouse_grid_6x5");
    }

    if (maxRounds < 5) {
      next.mouse.maxRounds = Math.min(5, maxRounds + 1);
      newlyUnlocked.push(`mouse_rounds_${next.mouse.maxRounds}`);
    }
  }

  if (mode === "house") {
    const details = (modeDetails.house as Record<string, unknown>) ?? {};
    const speedRaw = String(details?.speed ?? "easy");
    const speed: HouseSpeed =
      speedRaw === "easy" || speedRaw === "normal" || speedRaw === "fast" ? speedRaw : "easy";
    const eventCount = clampInt(details?.eventCount, 6);
    const initialPeople = clampInt(details?.initialPeople, 3);

    const speeds: HouseSpeed[] = Array.isArray(next.house.speeds) ? next.house.speeds : ["easy"];
    const maxInitialPeople = clampInt((next.house as unknown as { maxInitialPeople?: unknown }).maxInitialPeople, 3);
    const maxEvents = clampInt(next.house.maxEvents, 6);
    const maxRounds = clampInt(next.house.maxRounds, 3);

    const speedOrder: HouseSpeed[] = ["easy", "normal", "fast"];
    const currentIdx = speedOrder.indexOf(speed);
    const maxSpeedIdx = Math.max(...speeds.map((s) => speedOrder.indexOf(s)).filter((i) => i >= 0));

    if (eventCount >= maxEvents && maxEvents < 24) {
      next.house.maxEvents = Math.min(24, maxEvents + 3);
      newlyUnlocked.push(`house_events_${next.house.maxEvents}`);
    }

    if (initialPeople >= maxInitialPeople && maxInitialPeople < 7) {
      next.house.maxInitialPeople = Math.min(7, maxInitialPeople + 1);
      newlyUnlocked.push(`house_initial_${next.house.maxInitialPeople}`);
    }

    if (currentIdx >= 0 && currentIdx >= maxSpeedIdx && currentIdx < speedOrder.length - 1) {
      const nextSpeed = speedOrder[currentIdx + 1];
      if (!speeds.includes(nextSpeed)) {
        next.house.speeds = [...speeds, nextSpeed];
        newlyUnlocked.push(`house_speed_${nextSpeed}`);
      }
    }

    if (maxRounds < 5) {
      next.house.maxRounds = Math.min(5, maxRounds + 1);
      newlyUnlocked.push(`house_rounds_${next.house.maxRounds}`);
    }
  }

  return { next, newlyUnlocked };
};

let sessionSyncWorkerRunning = false;

const calculateStreak = (lastPlayedDate: string | null): number => {
  if (!lastPlayedDate) return 1;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastPlayed = new Date(lastPlayedDate);
  lastPlayed.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - lastPlayed.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  // Same day = continue streak, 1 day ago = increment, >1 day = reset to 1
  if (diffDays === 0) return 0; // Return 0 to indicate "don't increment"
  if (diffDays === 1) return 1; // Increment streak
  return -1; // Reset streak
};

const updateBrainStats = (
  current: BrainStats,
  summary: SessionSummary,
  history: SessionHistoryEntry[]
): BrainStats => {
  const recent20 = history.slice(-20);
  const avgAccuracy = recent20.length > 0
    ? recent20.reduce((sum, s) => sum + s.accuracy, 0) / recent20.length
    : summary.accuracy;

  const mode = summary.config.mode;
  const n = summary.config.nLevel;
  const acc = summary.accuracy;
  const avgRT = summary.avgReactionTimeMs || 2000;

  // Clamp helper: normalize to 0-100
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

  // Memory: based on max N-levels achieved
  const memoryDelta = mode === 'numeric' || mode === 'spatial' || mode === 'mouse'
    ? n * 8 * (acc / 100) : 0;
  const memory = clamp(Math.max(current.memory, memoryDelta));

  // Focus: rolling average accuracy
  const focus = clamp(avgAccuracy);

  // Math: numeric mode specific
  const math = mode === 'numeric'
    ? clamp(Math.max(current.math, acc * 0.8 + n * 4))
    : current.math;

  // Observation: spatial + mouse
  const observation = (mode === 'spatial' || mode === 'mouse')
    ? clamp(Math.max(current.observation, acc * 0.7 + n * 5))
    : current.observation;

  // Load Capacity (负载力): house + high N-back
  const loadCapacity = (mode === 'house' || n >= 3)
    ? clamp(Math.max(current.loadCapacity, acc * 0.75 + n * 3))
    : current.loadCapacity;

  // Reaction: inverted reaction time (2000ms baseline → 100, 5000ms → 0)
  const reactionScore = clamp(((5000 - avgRT) / 3000) * 100);
  const reaction = current.reaction > 0
    ? clamp((current.reaction * 0.7 + reactionScore * 0.3))
    : reactionScore;

  return { memory, focus, math, observation, loadCapacity, reaction };
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      currentView: 'home',
      nextConfig: DEFAULT_CONFIG,
      lastSummary: null,
      lastUnlocks: [],
      lastRewards: null,
      sessionHistory: [],
      userProfile: {
        totalScore: 0,
        totalXP: 0,
        maxNLevel: 0,
        daysStreak: 0,
        lastPlayedDate: null,
        brainStats: {
          memory: 0,
          focus: 0,
          math: 0,
          observation: 0,
          loadCapacity: 0,
          reaction: 0,
        },
        auth: {
          status: 'guest',
          displayName: 'Guest',
          avatarUrl: null,
          linkedProviders: ['guest'],
        },
        completedMilestones: [],
        brainCoins: 0,
        energy: {
          current: ENERGY_MAX,
          max: ENERGY_MAX,
          lastUpdated: Date.now(),
          unlimitedUntil: 0,
        },
        checkIn: {
          lastCheckInDate: null,
          consecutiveDays: 0,
        },
        ownedItems: [],
        inventory: {},
        preferences: {
          language: 'zh', // Default to zh for now, or detect browser
          soundEnabled: true,
          hapticsEnabled: true,
        },
      },
      gameConfigs: {
        numeric: { nLevel: 1, rounds: 10 },
        spatial: { nLevel: 1, rounds: 10, gridSize: 3 },
        mouse: { count: 3, grid: [4, 3], difficulty: 'easy', rounds: 3 },
        house: { initialPeople: 3, eventCount: 6, speed: 'easy', rounds: 3 },
      },
      cloudUnlocks: null,
      optimisticUnlocks: null,
      cloudDailyActivity: null,
      pendingSessionUploads: [],
      activeCampaignRun: null,
      lastCampaignUpdate: null,

      setView: (view) => set({ currentView: view }),

      setAuthProfile: (auth) => {
        set((state) => {
          const prevAuth = state.userProfile.auth;
          const prevEnergy = state.userProfile.energy;

          if (prevAuth?.status === 'authenticated' && prevAuth.userId) {
            writeEnergyToStorage(getUserEnergyKey(prevAuth.userId), prevEnergy);
          } else {
            writeEnergyToStorage(ENERGY_STORAGE_KEY_GUEST, prevEnergy);
          }

          let nextEnergy: EnergyState = prevEnergy;

          if (auth.status === 'guest') {
            nextEnergy = readEnergyFromStorage(ENERGY_STORAGE_KEY_GUEST) ?? prevEnergy;
          } else {
            const intent = readAndClearAuthIntent();
            const isPromoteGuestToNewUser = intent === 'signup' && prevAuth?.status === 'guest';

            if (isPromoteGuestToNewUser) {
              nextEnergy = prevEnergy;
              if (auth.userId) writeEnergyToStorage(getUserEnergyKey(auth.userId), nextEnergy);
            } else {
              if (auth.userId) {
                nextEnergy =
                  readEnergyFromStorage(getUserEnergyKey(auth.userId)) ?? {
                    current: ENERGY_MAX,
                    max: ENERGY_MAX,
                    lastUpdated: Date.now(),
                    unlimitedUntil: 0,
                  };
              } else {
                nextEnergy = {
                  current: ENERGY_MAX,
                  max: ENERGY_MAX,
                  lastUpdated: Date.now(),
                  unlimitedUntil: 0,
                };
              }
            }
          }

          const isAuthUser =
            auth.status === 'authenticated' && typeof auth.userId === 'string' && auth.userId.length > 0;
          const wasAuthUser =
            prevAuth?.status === 'authenticated' && typeof prevAuth.userId === 'string' && prevAuth.userId.length > 0;
          const isUserChanged = isAuthUser && wasAuthUser && auth.userId !== prevAuth.userId;
          const isAuthTransition = isAuthUser && (!wasAuthUser || isUserChanged);

          if (isAuthTransition) {
            return {
              currentView: 'home',
              lastSummary: null,
              lastUnlocks: [],
              sessionHistory: [],
              userProfile: {
                totalScore: 0,
                totalXP: 0,
                maxNLevel: 0,
                daysStreak: 0,
                lastPlayedDate: null,
                brainStats: {
                  memory: 0,
                  focus: 0,
                  math: 0,
                  observation: 0,
                  loadCapacity: 0,
                  reaction: 0,
                },
                auth,
                completedMilestones: [],
                brainCoins: 0,
                energy: nextEnergy,
                checkIn: {
                  lastCheckInDate: null,
                  consecutiveDays: 0,
                },
                ownedItems: [],
                inventory: {},
                preferences: { language: 'zh', soundEnabled: true, hapticsEnabled: true },
              },
              gameConfigs: {
                numeric: { nLevel: 1, rounds: 10 },
                spatial: { nLevel: 1, rounds: 10, gridSize: 3 },
                mouse: { count: 3, grid: [4, 3], difficulty: 'easy', rounds: 3 },
                house: { initialPeople: 3, eventCount: 5, speed: 'easy', rounds: 3 },
              },
              cloudUnlocks: null,
              optimisticUnlocks: null,
              pendingSessionUploads: [],
            };
          }

          if (auth.status === 'guest' && prevAuth?.status !== 'guest') {
            return {
              currentView: 'home',
              lastSummary: null,
              lastUnlocks: [],
              sessionHistory: [],
              userProfile: {
                totalScore: 0,
                totalXP: 0,
                maxNLevel: 0,
                daysStreak: 0,
                lastPlayedDate: null,
                brainStats: {
                  memory: 0,
                  focus: 0,
                  math: 0,
                  observation: 0,
                  loadCapacity: 0,
                  reaction: 0,
                },
                auth,
                completedMilestones: [],
                brainCoins: 0,
                energy: nextEnergy,
                checkIn: {
                  lastCheckInDate: null,
                  consecutiveDays: 0,
                },
                ownedItems: [],
                inventory: {},
                preferences: { language: 'zh', soundEnabled: true, hapticsEnabled: true },
              },
              gameConfigs: {
                numeric: { nLevel: 1, rounds: 10 },
                spatial: { nLevel: 1, rounds: 10, gridSize: 3 },
                mouse: { count: 3, grid: [4, 3], difficulty: 'easy', rounds: 3 },
                house: { initialPeople: 3, eventCount: 5, speed: 'easy', rounds: 3 },
              },
              cloudUnlocks: null,
              optimisticUnlocks: null,
              pendingSessionUploads: [],
            };
          }

          return {
            userProfile: {
              ...state.userProfile,
              auth,
              energy: nextEnergy,
            },
            cloudUnlocks: auth.status === 'guest' ? null : state.cloudUnlocks,
            optimisticUnlocks: auth.status === 'guest' ? null : state.optimisticUnlocks,
          };
        });

        if (auth.status === 'authenticated') {
          setTimeout(() => {
            get().kickoffSessionSync();
          }, 0);
        }
      },

      setCloudUnlocks: (unlocks) => set({ cloudUnlocks: unlocks, optimisticUnlocks: unlocks }),
      setCloudDailyActivity: (activity) => set({ cloudDailyActivity: activity }),

      setNextConfig: (partial) =>
        set((state) => ({
          nextConfig: { ...state.nextConfig, ...partial },
        })),

      setActiveCampaignRun: (run) => set({ activeCampaignRun: run }),

      kickoffSessionSync: () => {
        if (sessionSyncWorkerRunning) return;
        const scheduleNext = () => {
          const st = get();
          const head = st.pendingSessionUploads[0];
          if (!head || !head.nextRetryAt) return;
          const waitMs = Math.max(0, head.nextRetryAt - Date.now());
          if (waitMs <= 0) {
            get().kickoffSessionSync();
            return;
          }
          setTimeout(() => {
            get().kickoffSessionSync();
          }, waitMs);
        };

        void (async () => {
          sessionSyncWorkerRunning = true;
          try {
            while (true) {
              const st = get();
              if (st.userProfile.auth?.status !== 'authenticated') return;
              const head = st.pendingSessionUploads[0];
              if (!head) return;
              if (head.nextRetryAt && Date.now() < head.nextRetryAt) {
                scheduleNext();
                return;
              }

              try {
                const resp = await fetch('/api/game/session', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify(head.body),
                });
                if (!resp.ok) {
                  if (resp.status === 401) return;
                  const errBody = await resp.json().catch(() => null);
                  const error = String((errBody as { error?: unknown } | null)?.error ?? '');
                  const nonRetryable = new Set([
                    'locked',
                    'insufficient_energy',
                    'unauthorized',
                    'invalid_body',
                    'missing_summary',
                    'invalid_mode',
                    'invalid_campaign_level',
                    'banned',
                    'user_not_found',
                  ]);

                  if (nonRetryable.has(error)) {
                    set((s) => ({ pendingSessionUploads: s.pendingSessionUploads.slice(1) }));
                    const fallback = await fetch('/api/user/profile', { credentials: 'include' }).catch(() => null);
                    if (fallback && fallback.ok) {
                      const p = await fallback.json().catch(() => null);
                      set((s) => ({
                        userProfile: {
                          ...s.userProfile,
                          totalXP: (p as { xp?: number } | null)?.xp ?? s.userProfile.totalXP,
                          brainCoins: (p as { brainCoins?: number } | null)?.brainCoins ?? s.userProfile.brainCoins,
                          energy: isEnergyState((p as { energy?: unknown } | null)?.energy)
                            ? (p as { energy: EnergyState }).energy
                            : s.userProfile.energy,
                          checkIn: isCheckInState((p as { checkIn?: unknown } | null)?.checkIn)
                            ? (p as { checkIn: CheckInState }).checkIn
                            : s.userProfile.checkIn,
                          ownedItems: Array.isArray((p as { ownedItems?: unknown } | null)?.ownedItems)
                            ? (p as { ownedItems: string[] }).ownedItems
                            : s.userProfile.ownedItems,
                        },
                        cloudUnlocks: (p as { unlocks?: GameUnlocks } | null)?.unlocks ?? s.cloudUnlocks,
                        optimisticUnlocks: (p as { unlocks?: GameUnlocks } | null)?.unlocks ?? s.optimisticUnlocks,
                        cloudDailyActivity: Array.isArray((p as { dailyActivity?: unknown } | null)?.dailyActivity)
                          ? ((p as { dailyActivity: DailyActivityEntry[] }).dailyActivity)
                          : s.cloudDailyActivity,
                      }));
                    }
                    continue;
                  }

                  throw new Error('retryable');
                }
                const data = await resp.json();

                set((s) => ({
                  pendingSessionUploads: s.pendingSessionUploads.slice(1),
                  userProfile: {
                    ...s.userProfile,
                    totalXP: data.xpAfter ?? s.userProfile.totalXP,
                    brainCoins: data.brainCoinsAfter ?? s.userProfile.brainCoins,
                    energy: mergeEnergyState(s.userProfile.energy, (data as { energy?: unknown } | null)?.energy),
                  },
                  lastCampaignUpdate: (data as { campaign?: unknown } | null)?.campaign ?? s.lastCampaignUpdate,
                  lastUnlocks: Array.isArray(data.newlyUnlocked) ? data.newlyUnlocked : s.lastUnlocks,
                  lastRewards: {
                    xpEarned: Number(data.xpEarned ?? 0) || 0,
                    unlockBonusCoins: Number(data.unlockBonusCoins ?? 0) || 0,
                    dailyPerfectBonus: Number(data.dailyPerfectBonus ?? 0) || 0,
                    dailyFirstWinBonus: Number(data.dailyFirstWinBonus ?? 0) || 0,
                    campaignStarBonus: Number(data.campaignStarBonus ?? 0) || 0,
                    brainCoinsEarned: Number(data.brainCoinsEarned ?? 0) || 0,
                    brainCoinsAfter: Number(data.brainCoinsAfter ?? s.userProfile.brainCoins) || s.userProfile.brainCoins,
                    xpAfter: Number(data.xpAfter ?? s.userProfile.totalXP) || s.userProfile.totalXP,
                    brainLevelBefore: Number(data.brainLevelBefore ?? 1) || 1,
                    brainLevelAfter: Number(data.brainLevelAfter ?? 1) || 1,
                    levelUp: Boolean(data.levelUp),
                    energyConsumed: Number(data.energyConsumed ?? 0) || 0,
                    energyRefunded: Number(data.energyRefunded ?? 0) || 0,
                  },
                  cloudUnlocks: data.unlocks ?? s.cloudUnlocks,
                  optimisticUnlocks: data.unlocks ?? s.optimisticUnlocks,
                  cloudDailyActivity: (() => {
                    if (!Array.isArray(s.cloudDailyActivity)) return s.cloudDailyActivity;
                    const dateKey = new Date().toISOString().slice(0, 10);
                    const xpEarned = Number(data.xpEarned ?? 0) || 0;
                    const next = [...s.cloudDailyActivity];
                    const idx = next.findIndex((e) => e.date === dateKey);
                    if (idx === -1) {
                      next.push({ date: dateKey, totalXp: xpEarned, sessionsCount: 1 });
                      return next;
                    }
                    const prev = next[idx];
                    next[idx] = {
                      ...prev,
                      totalXp: (prev.totalXp ?? 0) + xpEarned,
                      sessionsCount: (prev.sessionsCount ?? 0) + 1,
                    };
                    return next;
                  })(),
                }));
              } catch {
                const attempts = head.attempts + 1;
                const backoffMs = Math.min(60_000, 1000 * Math.pow(2, Math.min(6, attempts)));
                set((s) => ({
                  pendingSessionUploads: [
                    { ...head, attempts, nextRetryAt: Date.now() + backoffMs },
                    ...s.pendingSessionUploads.slice(1),
                  ],
                }));
                scheduleNext();
                return;
              }
            }
          } finally {
            sessionSyncWorkerRunning = false;
          }
        })();
      },

      updateGameConfig: (mode, config) =>
        set((state) => {
          if (state.userProfile.auth?.status === 'guest') return state;
          const current = state.gameConfigs[mode];
          let changed = false;
          for (const [k, v] of Object.entries(config)) {
            if ((current as Record<string, unknown>)[k] !== v) {
              changed = true;
              break;
            }
          }
          if (!changed) return state;
          return {
            gameConfigs: {
              ...state.gameConfigs,
              [mode]: { ...state.gameConfigs[mode], ...config },
            },
          };
        }),

      saveSession: (summary) => {
        const state = get();
        const timestamp = Date.now();
        const score = calculateScore(summary);

        const enrichedSummary: SessionSummary = {
          ...summary,
          timestamp,
          score,
        };

        if (state.userProfile.auth?.status === 'guest') {
          const run = state.activeCampaignRun;
          if (run) {
            const updated = updateGuestCampaignAfterSession({
              levelId: run.levelId,
              accuracy: enrichedSummary.accuracy,
              score,
              minAccuracy: run.minAccuracy,
              episodeId: run.episodeId,
              orderInEpisode: run.orderInEpisode,
              getNextLevelId: () => ({ nextEpisodeId: run.nextEpisodeId, nextLevelId: run.nextLevelId }),
            });
            set({ lastCampaignUpdate: { levelId: run.levelId, stars: updated.stars, passed: updated.passed } });
          }
          set({ lastSummary: enrichedSummary });
          return;
        }

        const historyEntry: SessionHistoryEntry = {
          timestamp,
          nLevel: summary.config.nLevel,
          accuracy: summary.accuracy,
          score,
          totalRounds: summary.totalRounds,
          mode: summary.config.mode,
          avgReactionTimeMs: summary.avgReactionTimeMs,
        };

        const newHistory = [...state.sessionHistory, historyEntry].slice(-50);

        const streakChange = calculateStreak(state.userProfile.lastPlayedDate);
        const newStreak =
          streakChange === 0 ? state.userProfile.daysStreak :
          streakChange === 1 ? state.userProfile.daysStreak + 1 :
          1;

        const newMaxNLevel =
          summary.accuracy >= 80 && summary.config.nLevel > state.userProfile.maxNLevel
            ? summary.config.nLevel
            : state.userProfile.maxNLevel;

        const newBrainStats = updateBrainStats(
          state.userProfile.brainStats,
          summary,
          newHistory
        );

        const milestones = [...(state.userProfile.completedMilestones || [])];
        if (summary.accuracy >= 90) {
          const mode = summary.config.mode;
          const n = summary.config.nLevel;
          if (mode === 'numeric') {
            if (n >= 2 && !milestones.includes('numeric_2back')) milestones.push('numeric_2back');
            if (n >= 3 && !milestones.includes('numeric_3back')) milestones.push('numeric_3back');
            if (n >= 5 && !milestones.includes('numeric_5back')) milestones.push('numeric_5back');
            if (n >= 7 && !milestones.includes('numeric_7back')) milestones.push('numeric_7back');
          }
          if (mode === 'spatial') {
            const gridSize = summary.config.gridSize || 3;
            if (gridSize === 3 && n >= 2 && !milestones.includes('spatial_3x3_2back')) milestones.push('spatial_3x3_2back');
            if (gridSize === 4 && n >= 2 && !milestones.includes('spatial_4x4_2back')) milestones.push('spatial_4x4_2back');
            if (gridSize === 5 && n >= 3 && !milestones.includes('spatial_5x5_3back')) milestones.push('spatial_5x5_3back');
            if (gridSize === 5 && !milestones.includes('spatial_5x5')) milestones.push('spatial_5x5');
          }
          if (mode === 'house') {
            const hc = state.gameConfigs.house;
            if (hc.speed === 'normal' && hc.eventCount >= 12 && !milestones.includes('house_normal_12')) milestones.push('house_normal_12');
            if (hc.speed === 'fast' && hc.eventCount >= 15 && !milestones.includes('house_fast_15')) milestones.push('house_fast_15');
          }
        }

        const current = get();
        const mode = enrichedSummary.config.mode;
        const modeDetails: Record<string, unknown> = {};
        if (mode === 'mouse') {
          const mc = current.gameConfigs.mouse;
          modeDetails.mouse = {
            numMice: mc.count,
            cols: mc.grid[0],
            rows: mc.grid[1],
            difficulty: mc.difficulty,
            totalRounds: mc.rounds,
            numPushes: enrichedSummary.config.nLevel,
          };
        }
        if (mode === 'house') {
          const hc = current.gameConfigs.house;
          modeDetails.house = {
            initialPeople: hc.initialPeople,
            eventCount: hc.eventCount,
            speed: hc.speed,
            rounds: hc.rounds,
          };
        }

        const xpEarnedLocal = calculateXpEarned(enrichedSummary);
        const unlockBase = state.optimisticUnlocks ?? state.cloudUnlocks ?? defaultUnlocks();
        const unlockUpdateLocal = updateUnlocksAfterSession(unlockBase, enrichedSummary, modeDetails);
        const unlockBonusCoinsLocal = unlockUpdateLocal.newlyUnlocked.length * 20;

        const brainCoinsEarnedLocal = calculateBrainCoinsEarned(score);
        const dailyPerfectBonusLocal = 0;
        const dailyFirstWinBonusLocal = 0;

        // Campaign star bonus (delta strategy: only award improvement over previous best)
        let campaignStarBonusLocal = 0;
        const campaignRun = state.activeCampaignRun;
        if (campaignRun) {
          const STAR_BONUS = [0, 5, 10, 20]; // 0star, 1star, 2star, 3star
          const newStars = computeStars(enrichedSummary.accuracy);
          // For authenticated: check existing results from pending uploads or assume 0
          // Server will handle deduplication; locally we compute an optimistic delta
          campaignStarBonusLocal = Math.max(0, STAR_BONUS[newStars] ?? 0);
        }
        const brainCoinsAfterLocal =
          (state.userProfile.brainCoins ?? 0) +
          brainCoinsEarnedLocal +
          unlockBonusCoinsLocal +
          dailyPerfectBonusLocal +
          dailyFirstWinBonusLocal +
          campaignStarBonusLocal;

        const brainLevelBeforeLocal = getBrainRank(state.userProfile.totalXP ?? 0, milestones).level;
        const brainLevelAfterLocal = getBrainRank((state.userProfile.totalXP ?? 0) + xpEarnedLocal, milestones).level;
        const levelUpLocal = brainLevelAfterLocal > brainLevelBeforeLocal;

        const now = Date.now();
        const energyUnlimited = state.userProfile.energy.unlimitedUntil > now;
        const energyConsumedLocal = energyUnlimited ? 0 : 1;
        const energyRefundedLocal = 0;

        set({
          lastSummary: enrichedSummary,
          lastUnlocks: unlockUpdateLocal.newlyUnlocked,
          lastRewards: {
            xpEarned: xpEarnedLocal,
            unlockBonusCoins: unlockBonusCoinsLocal,
            dailyPerfectBonus: dailyPerfectBonusLocal,
            dailyFirstWinBonus: dailyFirstWinBonusLocal,
            campaignStarBonus: campaignStarBonusLocal,
            brainCoinsEarned: brainCoinsEarnedLocal,
            brainCoinsAfter: brainCoinsAfterLocal,
            xpAfter: (state.userProfile.totalXP ?? 0) + xpEarnedLocal,
            brainLevelBefore: brainLevelBeforeLocal,
            brainLevelAfter: brainLevelAfterLocal,
            levelUp: levelUpLocal,
            energyConsumed: energyConsumedLocal,
            energyRefunded: energyRefundedLocal,
          },
          sessionHistory: newHistory,
          userProfile: {
            ...state.userProfile,
            totalScore: state.userProfile.totalScore + score,
            maxNLevel: newMaxNLevel,
            daysStreak: newStreak,
            lastPlayedDate: new Date().toISOString(),
            brainStats: newBrainStats,
            brainCoins: state.userProfile.brainCoins + brainCoinsEarnedLocal + unlockBonusCoinsLocal + dailyPerfectBonusLocal + campaignStarBonusLocal,
            completedMilestones: milestones,
          },
          optimisticUnlocks: unlockUpdateLocal.next,
        });

        set((s) => ({
          pendingSessionUploads: [
            ...s.pendingSessionUploads,
            {
              id: `${timestamp}-${Math.random().toString(16).slice(2)}`,
              body: {
                summary: {
                  config: enrichedSummary.config,
                  totalRounds: enrichedSummary.totalRounds,
                  correctCount: enrichedSummary.correctCount,
                  incorrectCount: enrichedSummary.incorrectCount,
                  missedCount: enrichedSummary.missedCount,
                  accuracy: enrichedSummary.accuracy,
                  avgReactionTimeMs: enrichedSummary.avgReactionTimeMs,
                  durationMs: enrichedSummary.durationMs,
                  timestamp: enrichedSummary.timestamp,
                  score: enrichedSummary.score,
                },
                modeDetails,
                ...(s.activeCampaignRun ? { campaignLevelId: s.activeCampaignRun.levelId } : {}),
              },
              attempts: 0,
              nextRetryAt: 0,
            },
          ],
        }));
        get().kickoffSessionSync();
      },

      goToGame: () => set({ currentView: 'game' }),

      goToResult: (summary) =>
        set({
          currentView: 'result',
          lastSummary: summary,
        }),

      goHome: () => set({ currentView: 'home', lastSummary: null, lastUnlocks: [], activeCampaignRun: null }),

      // ---- Economy Actions ----

      recalculateEnergy: () =>
        set((state) => {
          const now = Date.now();
          // Check unlimited energy
          if (state.userProfile.energy.unlimitedUntil > now) return state;
          const recovered = calculateRecoveredEnergy(state.userProfile.energy);
          if (recovered.current === state.userProfile.energy.current) return state;
          return {
            userProfile: {
              ...state.userProfile,
              energy: recovered,
            },
          };
        }),

      consumeEnergy: () => {
        const state = get();
        const now = Date.now();
        // Unlimited energy check
        if (state.userProfile.energy.unlimitedUntil > now) return true;
        // Recalculate first
        const recovered = calculateRecoveredEnergy(state.userProfile.energy);
        if (recovered.current <= 0) return false;
        set({
          userProfile: {
            ...state.userProfile,
            energy: {
              ...recovered,
              current: recovered.current - 1,
              lastUpdated: recovered.current === recovered.max ? now : recovered.lastUpdated,
            },
          },
        });
        return true;
      },

      addEnergy: (amount) =>
        set((state) => ({
          userProfile: {
            ...state.userProfile,
            energy: {
              ...state.userProfile.energy,
              current: Math.min(state.userProfile.energy.max, state.userProfile.energy.current + amount),
            },
          },
        })),

      performCheckIn: async () => {
        const state = get();
        if (state.userProfile.auth?.status === 'guest') return null;
        const today = new Date().toISOString().slice(0, 10);
        const lastDate = state.userProfile.checkIn.lastCheckInDate;

        // Already checked in today
        if (lastDate === today) return null;

        // Calculate consecutive days
        let newConsecutive = 1;
        if (lastDate) {
          const last = new Date(lastDate);
          const todayDate = new Date(today);
          const diff = (todayDate.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
          if (diff === 1) {
            newConsecutive = state.userProfile.checkIn.consecutiveDays + 1;
          }
        }

        const reward = getCheckInReward(newConsecutive);
        const prev = {
          totalXP: state.userProfile.totalXP,
          brainCoins: state.userProfile.brainCoins,
          checkIn: state.userProfile.checkIn,
          daysStreak: state.userProfile.daysStreak,
        };

        set((s) => ({
          userProfile: {
            ...s.userProfile,
            totalXP: s.userProfile.totalXP + (reward.xp ?? 0),
            brainCoins: s.userProfile.brainCoins + (reward.coins ?? 0),
            checkIn: {
              lastCheckInDate: today,
              consecutiveDays: newConsecutive,
            },
            daysStreak: newConsecutive,
          },
        }));

        try {
          const resp = await fetch('/api/user/checkin', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'include',
          });

          if (!resp.ok) throw new Error('checkin_failed');

          const data = await resp.json().catch(() => null);
          const serverCheckIn = (data as { checkIn?: unknown } | null)?.checkIn as CheckInState | undefined;
          const alreadyCheckedIn = Boolean((data as { alreadyCheckedIn?: unknown } | null)?.alreadyCheckedIn);

          set((s) => ({
            userProfile: {
              ...s.userProfile,
              totalXP:
                typeof (data as { xpAfter?: unknown } | null)?.xpAfter === 'number'
                  ? ((data as { xpAfter: number }).xpAfter ?? s.userProfile.totalXP)
                  : s.userProfile.totalXP,
              brainCoins:
                typeof (data as { brainCoinsAfter?: unknown } | null)?.brainCoinsAfter === 'number'
                  ? ((data as { brainCoinsAfter: number }).brainCoinsAfter ?? s.userProfile.brainCoins)
                  : s.userProfile.brainCoins,
              checkIn: serverCheckIn ?? s.userProfile.checkIn,
              daysStreak: serverCheckIn?.consecutiveDays ?? s.userProfile.daysStreak,
            },
          }));

          if (alreadyCheckedIn) return null;
          return { xpGained: reward.xp ?? 0, coinsGained: reward.coins ?? 0 };
        } catch {
          const reconcile = async () => {
            try {
              const resp = await fetch('/api/user/profile', { credentials: 'include' });
              if (!resp.ok) throw new Error('profile_failed');
              const p = await resp.json().catch(() => null);
              const pCheckIn = (p as { checkIn?: unknown } | null)?.checkIn;
              const pLastDate = (pCheckIn as { lastCheckInDate?: unknown } | null)?.lastCheckInDate;
              const isServerChecked = String(pLastDate ?? '') === today;

              if (!isServerChecked) {
                set((s) => ({
                  userProfile: {
                    ...s.userProfile,
                    totalXP: prev.totalXP,
                    brainCoins: prev.brainCoins,
                    checkIn: prev.checkIn,
                    daysStreak: prev.daysStreak,
                  },
                }));
                return;
              }

              set((s) => ({
                userProfile: {
                  ...s.userProfile,
                  totalXP: (p as { xp?: number } | null)?.xp ?? s.userProfile.totalXP,
                  brainCoins: (p as { brainCoins?: number } | null)?.brainCoins ?? s.userProfile.brainCoins,
                  checkIn: isCheckInState(pCheckIn) ? (pCheckIn as CheckInState) : s.userProfile.checkIn,
                  daysStreak:
                    isCheckInState(pCheckIn) ? (pCheckIn as CheckInState).consecutiveDays : s.userProfile.daysStreak,
                },
              }));
            } catch {
              return;
            }
          };

          void reconcile();
          setTimeout(() => {
            void reconcile();
          }, 2000);

          return { xpGained: reward.xp ?? 0, coinsGained: reward.coins ?? 0 };
        }
      },

      purchaseProduct: async (productId) => {
        const state = get();
        if (state.userProfile.auth?.status === 'guest') return { ok: false, error: 'unauthorized' };
        const product = STORE_PRODUCTS.find((p) => p.id === productId);
        if (!product) return { ok: false, error: 'invalid_product' };

        try {
          const resp = await fetch('/api/store/buy', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ productId }),
          });

          if (!resp.ok) {
            const data = await resp.json().catch(() => null);
            return { ok: false, error: String(data?.error ?? 'server_error') };
          }

          const data = await resp.json();
          set((s) => ({
            userProfile: {
              ...s.userProfile,
              brainCoins: typeof data?.brainCoins === 'number' ? data.brainCoins : s.userProfile.brainCoins,
              energy: data?.energy ? { ...s.userProfile.energy, ...data.energy } : s.userProfile.energy,
              ownedItems: Array.isArray(data?.ownedItems) ? data.ownedItems : s.userProfile.ownedItems,
              inventory:
                data?.inventory && typeof data.inventory === 'object' ? (data.inventory as Record<string, number>) : s.userProfile.inventory,
            },
          }));

          return { ok: true };
        } catch {
          return { ok: false, error: 'network_error' };
        }
      },

      addBrainCoins: (amount) =>
        set((state) => {
          if (state.userProfile.auth?.status === 'guest') return state;
          return {
            userProfile: {
              ...state.userProfile,
              brainCoins: state.userProfile.brainCoins + amount,
            },
          };
        }),
    }),
    {
      name: 'brain-flow-storage', // localStorage key
      version: 7,
      partialize: (state) => ({
        // Only persist these fields (exclude transient state like currentView)
        sessionHistory: state.sessionHistory,
        userProfile: state.userProfile,
        gameConfigs: state.gameConfigs,
        cloudUnlocks: state.cloudUnlocks,
        optimisticUnlocks: state.optimisticUnlocks,
        pendingSessionUploads: state.pendingSessionUploads,
      }),
      migrate: (persistedState: unknown, version: number) => {
        if (version >= 7) return persistedState;
        if (!persistedState || typeof persistedState !== 'object') return persistedState;

        const state = persistedState as {
          userProfile?: Partial<UserProfile>;
          sessionHistory?: Array<Partial<SessionHistoryEntry>>;
          cloudUnlocks?: GameUnlocks | null;
          optimisticUnlocks?: GameUnlocks | null;
          pendingSessionUploads?: Array<{ id?: unknown; body?: unknown; attempts?: unknown; nextRetryAt?: unknown }>;
        };

        if (state.userProfile) {
          const p = state.userProfile;
          state.userProfile = {
            totalScore: p.totalScore ?? 0,
            totalXP: p.totalXP ?? 0,
            maxNLevel: p.maxNLevel ?? 0,
            daysStreak: p.daysStreak ?? 0,
            lastPlayedDate: p.lastPlayedDate ?? null,
            brainStats: p.brainStats ?? {
              memory: 0,
              focus: 0,
              math: 0,
              observation: 0,
              loadCapacity: 0,
              reaction: 0,
            },
            auth: p.auth ?? {
              status: 'guest',
              displayName: 'Guest',
              avatarUrl: null,
              linkedProviders: ['guest'],
            },
            completedMilestones: p.completedMilestones ?? [],
            brainCoins: (p as unknown as { brainCoins?: number }).brainCoins ?? (p as unknown as { brainPoints?: number }).brainPoints ?? 0,
            energy: p.energy ?? {
              current: ENERGY_MAX,
              max: ENERGY_MAX,
              lastUpdated: Date.now(),
              unlimitedUntil: 0,
            },
            checkIn: p.checkIn ?? {
              lastCheckInDate: null,
              consecutiveDays: 0,
            },
            ownedItems: p.ownedItems ?? [],
            inventory: (p as unknown as { inventory?: Record<string, number> }).inventory ?? {},
            preferences: p.preferences ?? {
              language: 'zh',
              soundEnabled: true,
              hapticsEnabled: true,
            },
          };
        }

        if (state.sessionHistory) {
          state.sessionHistory = state.sessionHistory.map((entry) => ({
            ...entry,
            mode: entry.mode ?? 'numeric',
            avgReactionTimeMs: entry.avgReactionTimeMs ?? undefined,
          }));
        }

        state.cloudUnlocks = state.cloudUnlocks ?? null;
        state.optimisticUnlocks = state.optimisticUnlocks ?? state.cloudUnlocks ?? null;
        state.pendingSessionUploads =
          Array.isArray(state.pendingSessionUploads)
            ? state.pendingSessionUploads
                .map((x) => ({
                  id: String(x?.id ?? ''),
                  body: x?.body ?? null,
                  attempts: Number(x?.attempts ?? 0) || 0,
                  nextRetryAt: Number(x?.nextRetryAt ?? 0) || 0,
                }))
                .filter((x) => x.id.length > 0 && x.body)
            : [];
        return state;
      },
    }
  )
);
