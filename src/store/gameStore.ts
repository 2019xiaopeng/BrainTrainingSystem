// ============================================================
// Brain Flow - Guest-only Local Store (Zustand)
// Arcade pivot: no auth, no economy, no cloud sync.
// Everything here is local-only and persisted to localStorage.
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NBackConfig, SessionSummary, UserProfile, SessionHistoryEntry, GameConfigs, GameMode, BrainStats } from '../types/game';
import { DEFAULT_CONFIG } from '../types/game';

interface GameStore {
  /** The config to use for the next game */
  nextConfig: NBackConfig;
  /** The most recent session summary (for the result screen) */
  lastSummary: SessionSummary | null;
  /** Simplified history of last 50 sessions */
  sessionHistory: SessionHistoryEntry[];
  /** User's local profile */
  userProfile: UserProfile;
  /** User's saved game configurations */
  gameConfigs: GameConfigs;
  /** Whether game sound effects are enabled */
  soundEnabled: boolean;

  // Actions
  setNextConfig: (config: Partial<NBackConfig>) => void;
  setSoundEnabled: (enabled: boolean) => void;
  updateGameConfig: (mode: keyof GameConfigs, config: Partial<GameConfigs[keyof GameConfigs]>) => void;
  saveSession: (summary: SessionSummary) => void;
  resetLocalData: () => void;
}

const EMPTY_STATS: BrainStats = {
  memory: 0,
  focus: 0,
  math: 0,
  observation: 0,
  loadCapacity: 0,
  reaction: 0,
};

const defaultUserProfile = (): UserProfile => ({
  totalScore: 0,
  totalXP: 0,
  maxNLevel: 0,
  daysStreak: 0,
  lastPlayedDate: null,
  brainStats: { ...EMPTY_STATS },
  completedMilestones: [],
});

const defaultGameConfigs = (): GameConfigs => ({
  numeric: { nLevel: 1, rounds: 10 },
  spatial: { nLevel: 1, rounds: 10, gridSize: 3 },
  mouse: { count: 3, grid: [4, 3], difficulty: 'easy', rounds: 3 },
  house: { initialPeople: 3, eventCount: 6, speed: 'easy', rounds: 3 },
  reaction: { trials: 5 },
  numberMemory: { startDigits: 3 },
  sequence: { gridSize: 3 },
  stroop: { durationSec: 60 },
});

// Score formula: (accuracy * nLevel * totalRounds) / 10
const calculateScore = (summary: SessionSummary): number =>
  Math.round((summary.accuracy * summary.config.nLevel * summary.totalRounds) / 10);

const calculateXpEarned = (summary: SessionSummary): number => {
  const accuracy = Number.isFinite(Number(summary.accuracy)) ? Number(summary.accuracy) : 0;
  const nLevel = Number.isFinite(Number(summary.config?.nLevel)) ? Number(summary.config.nLevel) : 1;
  const totalRounds = Number.isFinite(Number(summary.totalRounds)) ? Number(summary.totalRounds) : 1;
  const nCoeff = 1 + (Math.max(1, nLevel) - 1) * 0.2;
  const modeCoeff = totalRounds >= 20 ? 1.5 : 1.0;
  return Math.round(20 * (nCoeff + modeCoeff) * (Math.max(0, Math.min(100, accuracy)) / 100));
};

// Returns 0 = same day, 1 = increment streak, -1 = reset to 1
const calculateStreak = (lastPlayedDate: string | null): number => {
  if (!lastPlayedDate) return 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastPlayed = new Date(lastPlayedDate);
  lastPlayed.setHours(0, 0, 0, 0);

  const diffDays = (today.getTime() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays === 0) return 0;
  if (diffDays === 1) return 1;
  return -1;
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

  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

  const memoryDelta = mode === 'numeric' || mode === 'spatial' || mode === 'mouse'
    ? n * 8 * (acc / 100) : 0;
  const memory = clamp(Math.max(current.memory, memoryDelta));

  const focus = clamp(avgAccuracy);

  const math = mode === 'numeric'
    ? clamp(Math.max(current.math, acc * 0.8 + n * 4))
    : current.math;

  const observation = (mode === 'spatial' || mode === 'mouse')
    ? clamp(Math.max(current.observation, acc * 0.7 + n * 5))
    : current.observation;

  const loadCapacity = (mode === 'house' || n >= 3)
    ? clamp(Math.max(current.loadCapacity, acc * 0.75 + n * 3))
    : current.loadCapacity;

  const reactionScore = clamp(((5000 - avgRT) / 3000) * 100);
  const reaction = current.reaction > 0
    ? clamp((current.reaction * 0.7 + reactionScore * 0.3))
    : reactionScore;

  return { memory, focus, math, observation, loadCapacity, reaction };
};

const collectMilestones = (
  current: string[],
  summary: SessionSummary,
  gameConfigs: GameConfigs
): string[] => {
  const milestones = [...current];
  const push = (id: string) => {
    if (!milestones.includes(id)) milestones.push(id);
  };

  if (summary.accuracy < 90) return milestones;

  const mode = summary.config.mode;
  const n = summary.config.nLevel;

  if (mode === 'numeric') {
    if (n >= 2) push('numeric_2back');
    if (n >= 3) push('numeric_3back');
    if (n >= 5) push('numeric_5back');
    if (n >= 7) push('numeric_7back');
  }
  if (mode === 'spatial') {
    const gridSize = summary.config.gridSize || 3;
    if (gridSize === 3 && n >= 2) push('spatial_3x3_2back');
    if (gridSize === 4 && n >= 2) push('spatial_4x4_2back');
    if (gridSize === 5 && n >= 3) push('spatial_5x5_3back');
    if (gridSize === 5) push('spatial_5x5');
  }
  if (mode === 'mouse') {
    const mc = gameConfigs.mouse;
    if (mc.count >= 4) push('mouse_4mice');
    if (mc.count >= 7) push('mouse_7mice');
    if (mc.count >= 9) push('mouse_9mice');
  }
  if (mode === 'house') {
    const hc = gameConfigs.house;
    if (hc.speed === 'normal' && hc.eventCount >= 12) push('house_normal_12');
    if (hc.speed === 'fast' && hc.eventCount >= 15) push('house_fast_15');
  }

  return milestones;
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      nextConfig: DEFAULT_CONFIG,
      lastSummary: null,
      sessionHistory: [],
      userProfile: defaultUserProfile(),
      gameConfigs: defaultGameConfigs(),
      soundEnabled: true,

      setNextConfig: (config) =>
        set((state) => ({
          nextConfig: { ...state.nextConfig, ...config },
        })),

      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

      updateGameConfig: (mode, config) =>
        set((state) => ({
          gameConfigs: {
            ...state.gameConfigs,
            [mode]: { ...state.gameConfigs[mode], ...config },
          },
        })),

      saveSession: (summary) => {
        const state = get();
        const timestamp = Date.now();
        const score = calculateScore(summary);

        const enrichedSummary: SessionSummary = { ...summary, timestamp, score };

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

        const newBrainStats = updateBrainStats(state.userProfile.brainStats, summary, newHistory);
        const milestones = collectMilestones(state.userProfile.completedMilestones || [], summary, state.gameConfigs);

        set({
          lastSummary: enrichedSummary,
          sessionHistory: newHistory,
          userProfile: {
            ...state.userProfile,
            totalScore: state.userProfile.totalScore + score,
            totalXP: state.userProfile.totalXP + calculateXpEarned(enrichedSummary),
            maxNLevel: newMaxNLevel,
            daysStreak: newStreak,
            lastPlayedDate: new Date().toISOString(),
            brainStats: newBrainStats,
            completedMilestones: milestones,
          },
        });
      },

      resetLocalData: () =>
        set({
          lastSummary: null,
          sessionHistory: [],
          userProfile: defaultUserProfile(),
          gameConfigs: defaultGameConfigs(),
        }),
    }),
    {
      name: 'brain-flow-storage',
      version: 8,
      partialize: (state) => ({
        sessionHistory: state.sessionHistory,
        userProfile: state.userProfile,
        gameConfigs: state.gameConfigs,
        soundEnabled: state.soundEnabled,
      }),
      // v7 (auth/economy era) and earlier: keep only the fields that still exist
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== 'object') return persistedState;
        const s = persistedState as {
          userProfile?: Partial<UserProfile>;
          sessionHistory?: Array<Partial<SessionHistoryEntry>>;
          gameConfigs?: Partial<GameConfigs>;
        };
        const p = s.userProfile ?? {};
        return {
          userProfile: {
            totalScore: p.totalScore ?? 0,
            totalXP: p.totalXP ?? 0,
            maxNLevel: p.maxNLevel ?? 0,
            daysStreak: p.daysStreak ?? 0,
            lastPlayedDate: p.lastPlayedDate ?? null,
            brainStats: p.brainStats ?? { ...EMPTY_STATS },
            completedMilestones: p.completedMilestones ?? [],
          },
          sessionHistory: (s.sessionHistory ?? []).map((entry) => ({
            ...entry,
            mode: entry.mode ?? ('numeric' as GameMode),
            avgReactionTimeMs: entry.avgReactionTimeMs ?? undefined,
          })),
          gameConfigs: { ...defaultGameConfigs(), ...(s.gameConfigs ?? {}) },
        };
      },
    }
  )
);
