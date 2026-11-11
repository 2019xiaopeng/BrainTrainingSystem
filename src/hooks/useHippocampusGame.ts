// ============================================================
// Brain Flow - Hippocampus Test (海马体测试) Game Engine Hook
// ============================================================
//
// Chimp-test-style visuospatial working memory (after Ayumu, 2007):
// numbers appear at random grid positions, hide, and you tap them in
// ascending order from memory. Each level adds a number. Three wrong
// taps end the run; score = highest level completed.
//
// Timers use scheduleVisible so a hidden tab never burns the
// memorize window or skips a transition unseen.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NBackConfig, SessionSummary } from '../types/game';
import { DEFAULT_CONFIG } from '../types/game';
import { useGameStore } from '../store/gameStore';
import { useSoundEffects } from './useSoundEffects';
import { scheduleVisible } from '../lib/scheduleVisible';
import { knobsFor, normalizeDifficulty } from '../lib/arcadeDifficulty';

export type HippocampusPhase = 'idle' | 'showing' | 'recall' | 'feedback' | 'finished';

export interface HippocampusLevel {
  /** Grid is GRID_SIZE × GRID_SIZE */
  cells: (number | null)[];
}

export interface HippocampusResult {
  finalLevel: number;
  best: number;
  isNewBest: boolean;
  strikes: number;
  session: SessionSummary;
}

const BEST_KEY = 'brain-flow-best:hippocampus';
const GRID_SIZE = 5;
const REVEAL_MS = 350;
const FEEDBACK_MS = 700;
const MAX_STRIKES = 3;

/** numbers count for a level: startCount numbers at level 1, +1 per level */
const countForLevel = (level: number, startCount: number): number => startCount + level - 1;

function levelFor(level: number, startCount: number): HippocampusLevel {
  const total = GRID_SIZE * GRID_SIZE;
  const cells: (number | null)[] = new Array(total).fill(null);
  const spots = new Set<number>();
  const count = Math.min(countForLevel(level, startCount), total);
  while (spots.size < count) spots.add(Math.floor(Math.random() * total));
  [...spots].forEach((spot, i) => { cells[spot] = i + 1; });
  return { cells };
}

function readBest(): number {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (raw === null) return 0;
    const v = JSON.parse(raw);
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch {
    return 0;
  }
}

export function useHippocampusGame() {
  const [phase, setPhase] = useState<HippocampusPhase>('idle');
  const [level, setLevel] = useState(1);
  const [current, setCurrent] = useState<HippocampusLevel>(() => levelFor(1, 4));
  const [nextToTap, setNextToTap] = useState(1);
  const [lastRevealed, setLastRevealed] = useState<number | null>(null);
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const [strikes, setStrikes] = useState(0);
  const [finalLevel, setFinalLevel] = useState(0);
  const [best, setBest] = useState(() => readBest());
  const [isNewBest, setIsNewBest] = useState(false);

  const levelRef = useRef(1);
  const nextRef = useRef(1);
  const strikesRef = useRef(0);
  const savedRef = useRef(false);
  const startTimeRef = useRef(0);
  const timerRef = useRef<(() => void) | null>(null);
  const { playClick, playWrong, playFinish, playRecord } = useSoundEffects();

  const go = useCallback((p: HippocampusPhase) => setPhase(p), []);

  const armTimer = useCallback((fn: () => void, ms: number) => {
    timerRef.current?.();
    timerRef.current = scheduleVisible(fn, ms);
  }, []);

  const finish = useCallback(() => {
    timerRef.current?.();
    const cleared = levelRef.current - 1;
    const prevBest = readBest();
    const newBest = cleared > prevBest;
    if (newBest) {
      try { localStorage.setItem(BEST_KEY, JSON.stringify(cleared)); } catch { /* private mode */ }
    }
    setFinalLevel(cleared);
    setBest(newBest ? cleared : prevBest);
    setIsNewBest(newBest);
    if (newBest) playRecord(); else playFinish();

    const config: NBackConfig = {
      ...DEFAULT_CONFIG,
      nLevel: 1, totalRounds: cleared, mode: 'hippocampus', gridSize: GRID_SIZE,
    };
    const session: SessionSummary = {
      config,
      rounds: [],
      totalRounds: cleared,
      correctCount: cleared, incorrectCount: 0, missedCount: 0,
      hits: cleared, misses: 0, falseAlarms: 0, correctRejects: 0,
      accuracy: 100,
      avgReactionTimeMs: 0,
      durationMs: Date.now() - startTimeRef.current,
      timestamp: Date.now(),
    };
    if (!savedRef.current) {
      savedRef.current = true;
      useGameStore.getState().saveSession(session);
    }
    go('finished');
  }, [go, playFinish, playRecord]);

  // Difficulty knobs from the arcade-difficulty system (normal = old pacing)
  const knobs = knobsFor('hippocampus', normalizeDifficulty(useGameStore((s) => s.arcadeModes.hippocampus?.difficulty)));
  const knobsRef = useRef(knobs);
  // keep refs fresh without writing them during render (React Compiler lint)
  useEffect(() => {
    knobsRef.current = knobs;
  });

  const showLevel = useCallback((lvl: number) => {
    levelRef.current = lvl;
    nextRef.current = 1;
    setLevel(lvl);
    setNextToTap(1);
    setWrongCell(null);
    setLastRevealed(null);
    setCurrent(levelFor(lvl, knobsRef.current.startCount));
    go('showing');
    // showing→recall is armed by the effect below (StrictMode-safe: effect
    // timers re-arm after the double-mount cleanup; imperative arms don't)
  }, [go]);

  const start = useCallback(() => {
    strikesRef.current = 0;
    setStrikes(0);
    savedRef.current = false;
    setFinalLevel(0);
    setIsNewBest(false);
    startTimeRef.current = Date.now();
    showLevel(1);
  }, [showLevel]);

  const tapCell = useCallback((index: number) => {
    if (phase !== 'recall') return;
    const value = current.cells[index];
    if (value === nextRef.current) {
      playClick();
      setLastRevealed(index);
      armTimer(() => setLastRevealed(null), REVEAL_MS);
      nextRef.current += 1;
      setNextToTap(nextRef.current);
      if (nextRef.current > countForLevel(levelRef.current, knobsRef.current.startCount)) {
        // level cleared → brief cue; the effect above advances to the next level
        go('feedback');
      }
    } else {
      playWrong();
      setWrongCell(index);
      armTimer(() => setWrongCell(null), REVEAL_MS);
      strikesRef.current += 1;
      setStrikes(strikesRef.current);
      if (strikesRef.current >= MAX_STRIKES) finish();
    }
  }, [phase, current, armTimer, go, finish, playClick, playWrong]);

  // Phase-driven timers (StrictMode-safe): showing → recall, feedback → next level
  useEffect(() => {
    if (phase === 'showing') {
      return scheduleVisible(
        () => go('recall'),
        knobsRef.current.showBaseMs + countForLevel(levelRef.current, knobsRef.current.startCount) * knobsRef.current.showPerNumberMs,
      );
    }
    if (phase === 'feedback') {
      return scheduleVisible(() => showLevel(levelRef.current + 1), FEEDBACK_MS);
    }
    return undefined;
  }, [phase, go, showLevel]);

  // Never fire timers after unmount
  useEffect(() => () => timerRef.current?.(), []);

  return {
    phase, level, current, nextToTap, lastRevealed, wrongCell, strikes,
    finalLevel, best, isNewBest, gridSize: GRID_SIZE, maxStrikes: MAX_STRIKES,
    start, tapCell,
  };
}
