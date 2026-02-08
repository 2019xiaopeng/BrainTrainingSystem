// ============================================================
// Brain Flow - Global Application Store (Zustand)
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppView, NBackConfig, SessionSummary, UserProfile, SessionHistoryEntry, GameConfigs, GameMode, BrainStats, AuthProfile, EnergyState } from '../types/game';
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
  /** Simplified history of last 50 sessions */
  sessionHistory: SessionHistoryEntry[];
  /** User's persistent profile */
  userProfile: UserProfile;
  /** User's saved game configurations */
  gameConfigs: GameConfigs;

  // Actions
  setView: (view: AppView) => void;
  setAuthProfile: (auth: AuthProfile) => void;
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
  performCheckIn: () => { xpGained: number; pointsGained: number } | null;
  purchaseProduct: (productId: string) => boolean;
  addBrainPoints: (amount: number) => void;
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

const calculateXP = (summary: SessionSummary): number => {
  const n = summary.config.nLevel;
  const nCoeff = 1 + (n - 1) * 0.2;
  const modeCoeff = summary.totalRounds >= 20 ? 1.5 : 1.0;
  return Math.round(20 * (nCoeff + modeCoeff) * (summary.accuracy / 100));
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

  // Speed: inverted reaction time (2000ms baseline → 100, 5000ms → 0)
  const speedScore = clamp(((5000 - avgRT) / 3000) * 100);
  const speed = current.speed > 0
    ? clamp((current.speed * 0.7 + speedScore * 0.3))
    : speedScore;

  return { memory, focus, math, observation, loadCapacity, speed };
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      currentView: 'home',
      nextConfig: DEFAULT_CONFIG,
      lastSummary: null,
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
          speed: 0,
        },
        auth: {
          status: 'guest',
          displayName: 'Guest',
          avatarUrl: null,
          linkedProviders: ['guest'],
        },
        completedMilestones: [],
        brainPoints: 0,
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

          return {
            userProfile: {
              ...state.userProfile,
              auth,
              energy: nextEnergy,
            },
          };
        }),

      setNextConfig: (partial) =>
        set((state) => ({
          nextConfig: { ...state.nextConfig, ...partial },
        })),

      updateGameConfig: (mode, config) =>
        set((state) => {
          if (state.userProfile.auth?.status === 'guest') return state;
          return {
            gameConfigs: {
              ...state.gameConfigs,
              [mode]: { ...state.gameConfigs[mode], ...config },
            },
          };
        }),

      saveSession: (summary) =>
        set((state) => {
          const timestamp = Date.now();
          const score = calculateScore(summary);
          const xp = calculateXP(summary);
          
          // Update summary with timestamp and score
          const enrichedSummary: SessionSummary = {
            ...summary,
            timestamp,
            score,
          };

          if (state.userProfile.auth?.status === 'guest') {
            return {
              lastSummary: enrichedSummary,
            };
          }

          // Create history entry
          const historyEntry: SessionHistoryEntry = {
            timestamp,
            nLevel: summary.config.nLevel,
            accuracy: summary.accuracy,
            score,
            totalRounds: summary.totalRounds,
            mode: summary.config.mode,
            avgReactionTimeMs: summary.avgReactionTimeMs,
          };

          // Update history (keep last 50)
          const newHistory = [...state.sessionHistory, historyEntry].slice(-50);

          // Update user profile
          const streakChange = calculateStreak(state.userProfile.lastPlayedDate);
          const newStreak = 
            streakChange === 0 ? state.userProfile.daysStreak : // Same day
            streakChange === 1 ? state.userProfile.daysStreak + 1 : // Next day
            1; // Reset

          const newMaxNLevel = 
            summary.accuracy >= 80 && summary.config.nLevel > state.userProfile.maxNLevel
              ? summary.config.nLevel
              : state.userProfile.maxNLevel;

          const newBrainStats = updateBrainStats(
            state.userProfile.brainStats,
            summary,
            newHistory
          );

          // Check for new milestones (with fallback for backward compatibility)
          const milestones = [...(state.userProfile.completedMilestones || [])];
          if (summary.accuracy >= 80) {
            const mode = summary.config.mode;
            const n = summary.config.nLevel;
            
            // Numeric mode milestones
            if (mode === 'numeric') {
              if (n >= 2 && !milestones.includes('numeric_2back')) milestones.push('numeric_2back');
              if (n >= 3 && !milestones.includes('numeric_3back')) milestones.push('numeric_3back');
              if (n >= 5 && !milestones.includes('numeric_5back')) milestones.push('numeric_5back');
              if (n >= 7 && !milestones.includes('numeric_7back')) milestones.push('numeric_7back');
              if (n >= 9 && !milestones.includes('numeric_9back')) milestones.push('numeric_9back');
              if (n >= 11 && !milestones.includes('numeric_11back')) milestones.push('numeric_11back');
            }
            
            // Spatial mode milestones
            if (mode === 'spatial') {
              const gridSize = summary.config.gridSize || 3;
              if (gridSize >= 3 && !milestones.includes('spatial_3x3')) milestones.push('spatial_3x3');
              if (gridSize >= 4 && !milestones.includes('spatial_4x4')) milestones.push('spatial_4x4');
            }
          }

          return {
            lastSummary: enrichedSummary,
            sessionHistory: newHistory,
            userProfile: {
              ...state.userProfile,
              totalScore: state.userProfile.totalScore + score,
              totalXP: state.userProfile.totalXP + xp,
              maxNLevel: newMaxNLevel,
              daysStreak: newStreak,
              lastPlayedDate: new Date().toISOString(),
              brainStats: newBrainStats,
              brainPoints: state.userProfile.brainPoints + Math.round(score * 0.5),
              completedMilestones: milestones,
            },
          };
        }),

      goToGame: () => set({ currentView: 'game' }),

      goToResult: (summary) =>
        set({
          currentView: 'result',
          lastSummary: summary,
        }),

      goHome: () => set({ currentView: 'home', lastSummary: null }),

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

      performCheckIn: () => {
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

        set({
          userProfile: {
            ...state.userProfile,
            totalXP: state.userProfile.totalXP + reward.xp,
            brainPoints: state.userProfile.brainPoints + reward.points,
            checkIn: {
              lastCheckInDate: today,
              consecutiveDays: newConsecutive,
            },
          },
        });

        return { xpGained: reward.xp, pointsGained: reward.points };
      },

      purchaseProduct: (productId) => {
        const state = get();
        if (state.userProfile.auth?.status === 'guest') return false;
        const product = STORE_PRODUCTS.find((p) => p.id === productId);
        if (!product) return false;
        if (state.userProfile.brainPoints < product.price) return false;

        // Check if permanent item already owned
        if (product.type === 'permanent' && state.userProfile.ownedItems.includes(productId)) {
          return false;
        }

        let newProfile = {
          ...state.userProfile,
          brainPoints: state.userProfile.brainPoints - product.price,
        };

        // Apply product effect
        switch (product.effect.type) {
          case 'energy':
            newProfile = {
              ...newProfile,
              energy: {
                ...newProfile.energy,
                current: Math.min(newProfile.energy.max, newProfile.energy.current + product.effect.amount),
              },
            };
            break;
          case 'streak_saver':
            // Restore streak if broken (set lastPlayedDate to yesterday)
            {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              newProfile = {
                ...newProfile,
                lastPlayedDate: yesterday.toISOString(),
              };
            }
            break;
          case 'premium_report':
            newProfile = {
              ...newProfile,
              ownedItems: [...newProfile.ownedItems, productId],
            };
            break;
        }

        set({ userProfile: newProfile });
        return true;
      },

      addBrainPoints: (amount) =>
        set((state) => {
          if (state.userProfile.auth?.status === 'guest') return state;
          return {
            userProfile: {
              ...state.userProfile,
              brainPoints: state.userProfile.brainPoints + amount,
            },
          };
        }),
    }),
    {
      name: 'brain-flow-storage', // localStorage key
      version: 3, // Increment version to trigger migration for completedMilestones
      partialize: (state) => ({
        // Only persist these fields (exclude transient state like currentView)
        sessionHistory: state.sessionHistory,
        userProfile: state.userProfile,
        gameConfigs: state.gameConfigs,
      }),
      migrate: (persistedState: unknown, version: number) => {
        if (version >= 3) return persistedState;
        if (!persistedState || typeof persistedState !== 'object') return persistedState;

        const state = persistedState as {
          userProfile?: Partial<UserProfile>;
          sessionHistory?: Array<Partial<SessionHistoryEntry>>;
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
              speed: 0,
            },
            auth: p.auth ?? {
              status: 'guest',
              displayName: 'Guest',
              avatarUrl: null,
              linkedProviders: ['guest'],
            },
            completedMilestones: p.completedMilestones ?? [],
            brainPoints: p.brainPoints ?? 0,
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

        return state;
      },
    }
  )
);
