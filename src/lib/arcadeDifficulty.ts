import type { GameMode } from '../types/game';

/**
 * Arcade difficulty system (docs/arcade-difficulty-system.md):
 * fixed = one life / timed short challenge, endless = 3-life marathon.
 * Difficulty presets only tune parameters, never the score's meaning.
 */

export type ArcadeRunMode = 'fixed' | 'endless';
export type ArcadeDifficulty = 'easy' | 'normal' | 'hard';

export const ARCADE_LIVES: Record<ArcadeRunMode, number> = { fixed: 1, endless: 3 };

export interface ArcadeKnobs {
  numberMemory: { showBaseMs: number; showPerDigitMs: number; startDigits: number };
  sequence: { litMs: number; gapMs: number; startLevel: number };
  stroop: { durationSec: number };
  colorPerception: { startLevel: number };
  hippocampus: { showBaseMs: number; showPerNumberMs: number; startCount: number };
}

export const KNOBS: Record<ArcadeDifficulty, ArcadeKnobs> = {
  easy: {
    numberMemory: { showBaseMs: 1400, showPerDigitMs: 500, startDigits: 3 },
    sequence: { litMs: 750, gapMs: 300, startLevel: 4 },
    stroop: { durationSec: 90 },
    colorPerception: { startLevel: 1 },
    hippocampus: { showBaseMs: 2200, showPerNumberMs: 320, startCount: 3 },
  },
  normal: {
    numberMemory: { showBaseMs: 1000, showPerDigitMs: 400, startDigits: 3 },
    sequence: { litMs: 600, gapMs: 250, startLevel: 1 },
    stroop: { durationSec: 60 },
    colorPerception: { startLevel: 1 },
    hippocampus: { showBaseMs: 1400, showPerNumberMs: 240, startCount: 4 },
  },
  hard: {
    numberMemory: { showBaseMs: 700, showPerDigitMs: 300, startDigits: 5 },
    sequence: { litMs: 450, gapMs: 200, startLevel: 6 },
    stroop: { durationSec: 45 },
    colorPerception: { startLevel: 5 },
    hippocampus: { showBaseMs: 900, showPerNumberMs: 160, startCount: 5 },
  },
};

export const knobsFor = <K extends keyof ArcadeKnobs>(mode: K, difficulty: ArcadeDifficulty): ArcadeKnobs[K] =>
  KNOBS[difficulty][mode];

export const normalizeRunMode = (v: unknown): ArcadeRunMode => (v === 'endless' ? 'endless' : 'fixed');
export const normalizeDifficulty = (v: unknown): ArcadeDifficulty =>
  v === 'easy' || v === 'hard' ? v : 'normal';

/** Games whose config area shows the mode picker only (protocol fairness) */
export const DIFFICULTY_HIDDEN: GameMode[] = ['reaction'];

/** Reaction: fixed = standard 5-tap protocol, endless = 15-tap marathon */
export const reactionTrialsFor = (runMode: ArcadeRunMode, baseTrials: number): number =>
  runMode === 'endless' ? 15 : baseTrials;
