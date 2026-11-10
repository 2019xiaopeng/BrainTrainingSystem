import type { SessionHistoryEntry } from '../types/game';

export interface HeatmapDay {
  date: string;
  count: number;
  xp: number;
}

/**
 * Generate 365-day activity heatmap from local session history.
 * Returns array of { date, count, xp } for each day.
 */
export function generateYearlyHeatmap(history: SessionHistoryEntry[]): HeatmapDay[] {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);

  const map = new Map<string, { count: number; xp: number }>();

  for (let d = new Date(startOfYear); d <= endOfYear; d.setDate(d.getDate() + 1)) {
    map.set(d.toISOString().slice(0, 10), { count: 0, xp: 0 });
  }

  for (const entry of history) {
    const key = new Date(entry.timestamp).toISOString().slice(0, 10);
    const current = map.get(key);
    if (current) {
      map.set(key, { count: current.count + 1, xp: current.xp + entry.score });
    }
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => ({ date, count: data.count, xp: data.xp }));
}
