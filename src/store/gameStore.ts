// ============================================================
// Brain Flow - Global Application Store (Zustand)
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppView, NBackConfig, SessionSummary, UserProfile, SessionHistoryEntry } from '../types/game';
import { DEFAULT_CONFIG } from '../types/game';

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

  // Actions
  setView: (view: AppView) => void;
  setNextConfig: (config: Partial<NBackConfig>) => void;
  saveSession: (summary: SessionSummary) => void;
  goToGame: () => void;
  goToResult: (summary: SessionSummary) => void;
  goHome: () => void;
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

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      currentView: 'home',
      nextConfig: DEFAULT_CONFIG,
      lastSummary: null,
      sessionHistory: [],
      userProfile: {
        totalScore: 0,
        maxNLevel: 0,
        daysStreak: 0,
        lastPlayedDate: null,
      },

      setView: (view) => set({ currentView: view }),

      setNextConfig: (partial) =>
        set((state) => ({
          nextConfig: { ...state.nextConfig, ...partial },
        })),

      saveSession: (summary) =>
        set((state) => {
          const timestamp = Date.now();
          const score = calculateScore(summary);
          
          // Update summary with timestamp and score
          const enrichedSummary: SessionSummary = {
            ...summary,
            timestamp,
            score,
          };

          // Create history entry
          const historyEntry: SessionHistoryEntry = {
            timestamp,
            nLevel: summary.config.nLevel,
            accuracy: summary.accuracy,
            score,
            totalRounds: summary.totalRounds,
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

          return {
            lastSummary: enrichedSummary,
            sessionHistory: newHistory,
            userProfile: {
              totalScore: state.userProfile.totalScore + score,
              maxNLevel: newMaxNLevel,
              daysStreak: newStreak,
              lastPlayedDate: new Date().toISOString(),
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
    }),
    {
      name: 'brain-flow-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields (exclude transient state like currentView)
        sessionHistory: state.sessionHistory,
        userProfile: state.userProfile,
      }),
    }
  )
);
