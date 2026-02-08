// ============================================================
// Brain Flow - Comprehensive Mock Data for UI Development
// ============================================================

import type { SessionHistoryEntry, BrainStats, GameMode, UserProfile } from '../types/game';
import { ENERGY_MAX } from '../types/game';

// ------------------------------------------------------------
// Session History Generators
// ------------------------------------------------------------

/**
 * Generate realistic mock session history spread over 365 days.
 * Simulates a moderately active player with ~250 sessions per year.
 */
export function generateMockYearlyHistory(count = 250): SessionHistoryEntry[] {
  const modes: GameMode[] = ['numeric', 'spatial', 'mouse', 'house'];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Create sessions with realistic distribution:
  // More frequent in recent weeks, some gaps, variable performance
  return Array.from({ length: count }, (_, i) => {
    // Bias toward more recent dates
    const daysAgo = Math.floor(Math.pow(Math.random(), 1.3) * 365);
    const mode = modes[Math.floor(Math.random() * modes.length)];

    // Performance improves over time (newer sessions = better)
    const timeBonus = Math.min(20, Math.floor((365 - daysAgo) / 20));
    const nLevel = Math.min(7, Math.max(1, Math.floor(Math.random() * 3) + 1 + Math.floor(timeBonus / 10)));
    const baseAccuracy = 55 + timeBonus;
    const accuracy = Math.min(100, Math.floor(Math.random() * (100 - baseAccuracy) + baseAccuracy));
    const totalRounds = [10, 15, 20][Math.floor(Math.random() * 3)];
    const score = Math.round((accuracy * nLevel * totalRounds) / 10);
    const avgReactionTimeMs = Math.max(800, Math.floor(3000 - timeBonus * 50 - Math.random() * 800));

    return {
      timestamp: now - daysAgo * dayMs + (i % 5) * 3600000 + Math.floor(Math.random() * 7200000),
      nLevel,
      accuracy,
      score,
      totalRounds,
      mode,
      avgReactionTimeMs,
    };
  }).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Generate mock history for last 30 days (lightweight)
 */
export function generateMockRecentHistory(count = 35): SessionHistoryEntry[] {
  const modes: GameMode[] = ['numeric', 'spatial', 'mouse', 'house'];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  return Array.from({ length: count }, (_, i) => {
    const daysAgo = Math.floor(Math.random() * 30);
    const mode = modes[Math.floor(Math.random() * modes.length)];
    const nLevel = Math.floor(Math.random() * 4) + 1;
    const accuracy = Math.floor(Math.random() * 40) + 60;
    const totalRounds = [10, 15, 20][Math.floor(Math.random() * 3)];
    const score = Math.round((accuracy * nLevel * totalRounds) / 10);
    const avgReactionTimeMs = Math.floor(Math.random() * 2000) + 1000;

    return {
      timestamp: now - daysAgo * dayMs + i * 60000,
      nLevel,
      accuracy,
      score,
      totalRounds,
      mode,
      avgReactionTimeMs,
    };
  }).sort((a, b) => a.timestamp - b.timestamp);
}

// ------------------------------------------------------------
// Brain Stats
// ------------------------------------------------------------

/** Mid-level player brain stats */
export const MOCK_BRAIN_STATS: BrainStats = {
  memory: 72,
  focus: 78,
  math: 65,
  observation: 58,
  loadCapacity: 70,
  speed: 62,
};

/** Beginner brain stats */
export const MOCK_BEGINNER_STATS: BrainStats = {
  memory: 25,
  focus: 30,
  math: 20,
  observation: 15,
  loadCapacity: 22,
  speed: 28,
};

/** Advanced player brain stats */
export const MOCK_ADVANCED_STATS: BrainStats = {
  memory: 88,
  focus: 92,
  math: 85,
  observation: 80,
  loadCapacity: 87,
  speed: 78,
};

// ------------------------------------------------------------
// Heatmap Data Generator (365 days)
// ------------------------------------------------------------

export interface HeatmapDay {
  date: string;
  count: number;
  xp: number;
}

/**
 * Generate 365-day activity heatmap from session history.
 * Returns array of { date, count, xp } for each day.
 */
export function generateYearlyHeatmap(history: SessionHistoryEntry[]): HeatmapDay[] {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const map = new Map<string, { count: number; xp: number }>();

  // Initialize all 365 days
  for (let i = 364; i >= 0; i--) {
    const d = new Date(now.getTime() - i * dayMs);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { count: 0, xp: 0 });
  }

  // Aggregate sessions per day
  for (const entry of history) {
    const key = new Date(entry.timestamp).toISOString().slice(0, 10);
    if (map.has(key)) {
      const current = map.get(key)!;
      map.set(key, {
        count: current.count + 1,
        xp: current.xp + entry.score,
      });
    }
  }

  return Array.from(map.entries()).map(([date, data]) => ({
    date,
    count: data.count,
    xp: data.xp,
  }));
}

/**
 * Generate 30-day activity heatmap (legacy API compatibility)
 */
export function generateActivityHeatmap(history: SessionHistoryEntry[]): HeatmapDay[] {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const map = new Map<string, { count: number; xp: number }>();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * dayMs);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { count: 0, xp: 0 });
  }

  for (const entry of history) {
    const key = new Date(entry.timestamp).toISOString().slice(0, 10);
    if (map.has(key)) {
      const current = map.get(key)!;
      map.set(key, {
        count: current.count + 1,
        xp: current.xp + entry.score,
      });
    }
  }

  return Array.from(map.entries()).map(([date, data]) => ({
    date,
    count: data.count,
    xp: data.xp,
  }));
}

// ------------------------------------------------------------
// Leaderboard
// ------------------------------------------------------------

export interface LeaderboardEntry {
  rank: number;
  name: string;
  avgTime: number;
  accuracy: number;
}

export const MOCK_LEADERBOARD_2BACK: LeaderboardEntry[] = [
  { rank: 1, name: 'FlowMaster', avgTime: 1120, accuracy: 98 },
  { rank: 2, name: 'BrainAce', avgTime: 1250, accuracy: 96 },
  { rank: 3, name: 'ZenPlayer', avgTime: 1310, accuracy: 95 },
  { rank: 4, name: 'NeuralNinja', avgTime: 1440, accuracy: 94 },
  { rank: 5, name: 'MindWalker', avgTime: 1520, accuracy: 92 },
  { rank: 6, name: 'CogniPro', avgTime: 1600, accuracy: 91 },
  { rank: 7, name: 'MemoryKing', avgTime: 1680, accuracy: 90 },
];

export const MOCK_LEADERBOARD_3BACK: LeaderboardEntry[] = [
  { rank: 1, name: 'FlowMaster', avgTime: 1560, accuracy: 95 },
  { rank: 2, name: 'NeuralNinja', avgTime: 1680, accuracy: 93 },
  { rank: 3, name: 'BrainAce', avgTime: 1750, accuracy: 92 },
  { rank: 4, name: 'CogniPro', avgTime: 1840, accuracy: 91 },
  { rank: 5, name: 'ZenPlayer', avgTime: 1920, accuracy: 90 },
];

// ------------------------------------------------------------
// Complete Mock User Profile
// ------------------------------------------------------------

export const MOCK_USER_PROFILE: UserProfile = {
  totalScore: 18420,
  totalXP: 3200,
  maxNLevel: 3,
  daysStreak: 7,
  lastPlayedDate: new Date().toISOString(),
  brainStats: MOCK_BRAIN_STATS,
  auth: {
    status: 'guest',
    displayName: 'Guest',
    avatarUrl: null,
    linkedProviders: ['guest'],
  },  completedMilestones: ['numeric_2back', 'spatial_3x3'],  brainPoints: 2450,
  energy: {
    current: 3,
    max: ENERGY_MAX,
    lastUpdated: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    unlimitedUntil: 0,
  },
  checkIn: {
    lastCheckInDate: null,
    consecutiveDays: 5,
  },
  ownedItems: [],
};
