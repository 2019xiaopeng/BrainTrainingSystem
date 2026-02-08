// ============================================================
// Brain Flow - Mock Data for UI Development
// ============================================================

import type { SessionHistoryEntry, BrainStats, GameMode } from '../types/game';

/**
 * Generate realistic mock session history (last 30 days)
 */
export function generateMockHistory(count = 35): SessionHistoryEntry[] {
  const modes: GameMode[] = ['numeric', 'spatial', 'mouse', 'house'];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  return Array.from({ length: count }, (_, i) => {
    const daysAgo = Math.floor(Math.random() * 30);
    const mode = modes[Math.floor(Math.random() * modes.length)];
    const nLevel = Math.floor(Math.random() * 4) + 1; // 1-4
    const accuracy = Math.floor(Math.random() * 40) + 60; // 60-100
    const totalRounds = [10, 15, 20][Math.floor(Math.random() * 3)];
    const score = Math.round((accuracy * nLevel * totalRounds) / 10);
    const avgReactionTimeMs = Math.floor(Math.random() * 2000) + 1000; // 1000-3000

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

/**
 * Mock brain stats (mid-level player)
 */
export const MOCK_BRAIN_STATS: BrainStats = {
  memory: 72,
  focus: 78,
  math: 65,
  observation: 58,
  loadCapacity: 70,
  speed: 62,
};

/**
 * Mock leaderboard entries
 */
export interface LeaderboardEntry {
  rank: number;
  name: string;
  avgTime: number; // ms
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

/**
 * Generate activity heatmap data for the last 30 days.
 * Returns an array of { date: 'YYYY-MM-DD', count: number }
 */
export function generateActivityHeatmap(history: SessionHistoryEntry[]): { date: string; count: number }[] {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const map = new Map<string, number>();

  // Initialize last 30 days with 0
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * dayMs);
    const key = d.toISOString().slice(0, 10);
    map.set(key, 0);
  }

  // Count sessions per day
  for (const entry of history) {
    const key = new Date(entry.timestamp).toISOString().slice(0, 10);
    if (map.has(key)) {
      map.set(key, (map.get(key) || 0) + 1);
    }
  }

  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}
