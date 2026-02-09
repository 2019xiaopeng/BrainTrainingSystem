// ============================================================
// Brain Flow - Global Application Store (Zustand)
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppView, NBackConfig, SessionSummary, UserProfile, SessionHistoryEntry, GameConfigs, GameMode, BrainStats, AuthProfile, EnergyState, GameUnlocks, DailyActivityEntry } from '../types/game';
import { DEFAULT_CONFIG, ENERGY_MAX, calculateRecoveredEnergy, getCheckInReward, STORE_PRODUCTS } from '../types/game';

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
  /** Simplified history of last 50 sessions */
  sessionHistory: SessionHistoryEntry[];
  /** User's persistent profile */
  userProfile: UserProfile;
  /** User's saved game configurations */
  gameConfigs: GameConfigs;
  /** Cloud-sourced unlocks (skill trees) for each mode */
  cloudUnlocks: GameUnlocks | null;
  /** Cloud-sourced daily activity for heatmap */
  cloudDailyActivity: DailyActivityEntry[] | null;

  // Actions
  setView: (view: AppView) => void;
  setAuthProfile: (auth: AuthProfile) => void;
  setCloudUnlocks: (unlocks: GameUnlocks | null) => void;
  setCloudDailyActivity: (activity: DailyActivityEntry[] | null) => void;
  setNextConfig: (config: Partial<NBackConfig>) => void;
  saveSession: (summary: SessionSummary) => void;
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
      },
      gameConfigs: {
        numeric: { nLevel: 1, rounds: 10 },
        spatial: { nLevel: 1, rounds: 10, gridSize: 3 },
        mouse: { count: 3, grid: [4, 3], difficulty: 'easy', rounds: 3 },
        house: { initialPeople: 3, eventCount: 5, speed: 'easy', rounds: 3 },
      },
      cloudUnlocks: null,
      cloudDailyActivity: null,

      setView: (view) => set({ currentView: view }),

      setAuthProfile: (auth) =>
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
              },
              gameConfigs: {
                numeric: { nLevel: 1, rounds: 10 },
                spatial: { nLevel: 1, rounds: 10, gridSize: 3 },
                mouse: { count: 3, grid: [4, 3], difficulty: 'easy', rounds: 3 },
                house: { initialPeople: 3, eventCount: 5, speed: 'easy', rounds: 3 },
              },
              cloudUnlocks: null,
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
              },
              gameConfigs: {
                numeric: { nLevel: 1, rounds: 10 },
                spatial: { nLevel: 1, rounds: 10, gridSize: 3 },
                mouse: { count: 3, grid: [4, 3], difficulty: 'easy', rounds: 3 },
                house: { initialPeople: 3, eventCount: 5, speed: 'easy', rounds: 3 },
              },
              cloudUnlocks: null,
            };
          }

          return {
            userProfile: {
              ...state.userProfile,
              auth,
              energy: nextEnergy,
            },
            cloudUnlocks: auth.status === 'guest' ? null : state.cloudUnlocks,
          };
        }),

      setCloudUnlocks: (unlocks) => set({ cloudUnlocks: unlocks }),
      setCloudDailyActivity: (activity) => set({ cloudDailyActivity: activity }),

      setNextConfig: (partial) =>
        set((state) => ({
          nextConfig: { ...state.nextConfig, ...partial },
        })),

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
        if (summary.accuracy >= 80) {
          const mode = summary.config.mode;
          const n = summary.config.nLevel;
          if (mode === 'numeric') {
            if (n >= 2 && !milestones.includes('numeric_2back')) milestones.push('numeric_2back');
            if (n >= 3 && !milestones.includes('numeric_3back')) milestones.push('numeric_3back');
            if (n >= 5 && !milestones.includes('numeric_5back')) milestones.push('numeric_5back');
            if (n >= 7 && !milestones.includes('numeric_7back')) milestones.push('numeric_7back');
            if (n >= 9 && !milestones.includes('numeric_9back')) milestones.push('numeric_9back');
            if (n >= 11 && !milestones.includes('numeric_11back')) milestones.push('numeric_11back');
          }
          if (mode === 'spatial') {
            const gridSize = summary.config.gridSize || 3;
            if (gridSize >= 3 && !milestones.includes('spatial_3x3')) milestones.push('spatial_3x3');
            if (gridSize >= 4 && !milestones.includes('spatial_4x4')) milestones.push('spatial_4x4');
          }
        }

        set({
          lastSummary: enrichedSummary,
          lastUnlocks: [],
          sessionHistory: newHistory,
          userProfile: {
            ...state.userProfile,
            totalScore: state.userProfile.totalScore + score,
            maxNLevel: newMaxNLevel,
            daysStreak: newStreak,
            lastPlayedDate: new Date().toISOString(),
            brainStats: newBrainStats,
            brainCoins: state.userProfile.brainCoins + Math.round(score * 0.1),
            completedMilestones: milestones,
          },
        });

        void (async () => {
          try {
            const current = get();
            if (current.userProfile.auth?.status !== 'authenticated') return;

            const mode = enrichedSummary.config.mode;
            const modeDetails: {
              mouse?: {
                numMice: number;
                cols: number;
                rows: number;
                difficulty: string;
                totalRounds: number;
                numPushes: number;
              };
              house?: {
                initialPeople: number;
                eventCount: number;
                speed: string;
                rounds: number;
              };
            } = {};
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

            const resp = await fetch('/api/game/session', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
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
              }),
            });

            if (!resp.ok) {
              const fallback = await fetch('/api/user/profile', { credentials: 'include' });
              if (fallback.ok) {
                const p = await fallback.json();
                set((s) => ({
                  userProfile: {
                    ...s.userProfile,
                    totalXP: p.xp ?? s.userProfile.totalXP,
                    brainCoins: p.brainCoins ?? s.userProfile.brainCoins,
                    energy: p.energy ?? s.userProfile.energy,
                    checkIn: p.checkIn ?? s.userProfile.checkIn,
                    ownedItems: Array.isArray(p.ownedItems) ? p.ownedItems : s.userProfile.ownedItems,
                  },
                  cloudUnlocks: p.unlocks ?? s.cloudUnlocks,
                  cloudDailyActivity: Array.isArray(p.dailyActivity) ? p.dailyActivity : s.cloudDailyActivity,
                }));
              }
              return;
            }

            const data = await resp.json();
            set((s) => ({
              userProfile: {
                ...s.userProfile,
                totalXP: data.xpAfter ?? s.userProfile.totalXP,
                brainCoins: data.brainCoinsAfter ?? s.userProfile.brainCoins,
                energy: data.energy ?? s.userProfile.energy,
              },
              lastUnlocks: Array.isArray(data.newlyUnlocked) ? data.newlyUnlocked : s.lastUnlocks,
              cloudUnlocks: data.unlocks ?? s.cloudUnlocks,
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
            return;
          }
        })();
      },

      goToGame: () => set({ currentView: 'game' }),

      goToResult: (summary) =>
        set({
          currentView: 'result',
          lastSummary: summary,
        }),

      goHome: () => set({ currentView: 'home', lastSummary: null, lastUnlocks: [] }),

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

        try {
          const resp = await fetch('/api/user/checkin', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'include',
          });
          if (!resp.ok) return null;
          const data = await resp.json();
          if (data?.alreadyCheckedIn) return null;
          set((s) => ({
            userProfile: {
              ...s.userProfile,
              totalXP: data.xpAfter ?? s.userProfile.totalXP,
              brainCoins: data.brainCoinsAfter ?? s.userProfile.brainCoins,
              checkIn: data.checkIn ?? s.userProfile.checkIn,
            },
          }));

          const reward = data.reward ?? getCheckInReward(newConsecutive);
          return { xpGained: reward.xp ?? 0, coinsGained: reward.coins ?? 0 };
        } catch {
          return null;
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
      version: 6,
      partialize: (state) => ({
        // Only persist these fields (exclude transient state like currentView)
        sessionHistory: state.sessionHistory,
        userProfile: state.userProfile,
        gameConfigs: state.gameConfigs,
        cloudUnlocks: state.cloudUnlocks,
      }),
      migrate: (persistedState: unknown, version: number) => {
        if (version >= 6) return persistedState;
        if (!persistedState || typeof persistedState !== 'object') return persistedState;

        const state = persistedState as {
          userProfile?: Partial<UserProfile>;
          sessionHistory?: Array<Partial<SessionHistoryEntry>>;
          cloudUnlocks?: GameUnlocks | null;
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
        return state;
      },
    }
  )
);
