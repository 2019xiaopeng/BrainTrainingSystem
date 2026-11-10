import type { GameMode } from '../types/game';

/**
 * Published typical values shown next to a player's score.
 * Honesty rules: value + unit + named source only — never a percentile,
 * never a clinical norm. Games without a credible public reference stay
 * undefined and the comparison block renders history-only.
 */
export interface ReferenceValue {
  value: number;
  unit: string;
  /** Short source label, e.g. "humanbenchmark.com" */
  source: string;
  /** One-line note shown under the comparison */
  note: string;
}

export const REFERENCE_VALUES: Partial<Record<GameMode, ReferenceValue>> = {
  reaction: {
    value: 273,
    unit: 'ms',
    source: 'humanbenchmark.com',
    note: 'public aggregate, median of ≈81M samples — a typical value, not a clinical norm',
  },
  numberMemory: {
    value: 9,
    unit: 'digits',
    source: 'humanbenchmark data',
    note: 'third-party analysis of humanbenchmark scores (median 9, avg 9.2) — self-selected online population, not clinical digit-span norms',
  },
};

export const getReference = (mode: GameMode): ReferenceValue | undefined => REFERENCE_VALUES[mode];
