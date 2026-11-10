// ============================================================
// Brain Flow - Reaction Time Test (反应力测试) Game Engine Hook
// ============================================================
//
// Humanbenchmark-style: `trials` valid taps. Each trial waits a random
// delay, turns green, and measures ms from green to tap. A tap during
// the wait voids that attempt ("too soon") and re-arms the SAME trial
// with a fresh delay — too-soon taps never count toward the total.
//
// Hidden-tab safety: the wait timer uses scheduleVisible so the surface
// never turns green while the tab is hidden, and a visibilitychange
// during the green phase voids that trial (the elapsed time would be
// garbage after an unseen absence).

import { useCallback, useEffect, useRef, useState } from 'react';
import { scheduleVisible } from '../lib/scheduleVisible';
import type { NBackConfig, SessionSummary } from '../types/game';

export type ReactionPhase = 'idle' | 'waiting' | 'ready' | 'tooSoon' | 'feedback' | 'finished';

export interface ReactionResult {
  /** Average ms across all valid taps — the run's score */
  avgMs: number;
  /** Fastest valid tap this run */
  fastestMs: number;
  /** Personal best run average after this run (lower wins) */
  bestMs: number;
  /** Whether this run set a new personal best */
  isNewBest: boolean;
  /** Synthesized session to hand to the global store */
  session: SessionSummary;
}

const BEST_KEY = 'brain-flow-best:reaction';
const WAIT_MIN_MS = 1500;
const WAIT_MAX_MS = 4000;
const TOO_SOON_MS = 1200;
const FEEDBACK_MS = 900;

function loadBest(): number | null {
  try {
    const v = JSON.parse(localStorage.getItem(BEST_KEY) ?? 'null');
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

function saveBest(ms: number): void {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(ms));
  } catch {
    // Storage unavailable (private mode): best simply won't persist
  }
}

const randomDelay = (): number => WAIT_MIN_MS + Math.random() * (WAIT_MAX_MS - WAIT_MIN_MS);

export function useReactionGame(trials: number) {
  const [phase, setPhase] = useState<ReactionPhase>('idle');
  const [doneCount, setDoneCount] = useState(0);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [result, setResult] = useState<ReactionResult | null>(null);
  const [bestMs, setBestMs] = useState<number | null>(() => loadBest());

  const phaseRef = useRef<ReactionPhase>('idle');
  const cancelTimerRef = useRef<(() => void) | null>(null);
  const greenAtRef = useRef(0);
  const timesRef = useRef<number[]>([]);
  const runStartedAtRef = useRef(0);
  const trialsRef = useRef(trials);
  useEffect(() => {
    trialsRef.current = trials;
  }, [trials]);

  const go = useCallback((p: ReactionPhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  /** Arm the single pending transition, replacing any previous one */
  const arm = useCallback((fn: () => void, delayMs: number) => {
    cancelTimerRef.current?.();
    cancelTimerRef.current = scheduleVisible(fn, delayMs);
  }, []);

  /** Enter the wait phase and schedule the green flip */
  const armWait = useCallback(() => {
    go('waiting');
    arm(() => {
      greenAtRef.current = performance.now();
      go('ready');
    }, randomDelay());
  }, [arm, go]);

  const finish = useCallback(() => {
    const times = timesRef.current;
    const avgMs = Math.round(times.reduce((s, ms) => s + ms, 0) / times.length);
    const fastestMs = Math.min(...times);
    const prevBest = loadBest();
    const isNewBest = prevBest === null || avgMs < prevBest;
    if (isNewBest) saveBest(avgMs);
    const bestMsNow = isNewBest ? avgMs : prevBest;

    const config: NBackConfig = {
      nLevel: 1,
      totalRounds: times.length,
      stimulusDuration: 2000,
      interStimulusInterval: 500,
      stimulusType: 'number',
      mode: 'reaction',
      gridSize: 3,
    };
    const session: SessionSummary = {
      config,
      rounds: times.map((ms, i) => ({
        targetStimulusIndex: i,
        correctAnswer: 0,
        userAnswer: ms,
        isCorrect: true,
        reactionTimeMs: ms,
      })),
      totalRounds: times.length,
      correctCount: times.length,
      incorrectCount: 0,
      missedCount: 0,
      hits: times.length,
      misses: 0,
      falseAlarms: 0,
      correctRejects: 0,
      accuracy: 100,
      avgReactionTimeMs: avgMs,
      durationMs: Date.now() - runStartedAtRef.current,
      timestamp: Date.now(),
    };

    setBestMs(bestMsNow);
    setResult({ avgMs, fastestMs, bestMs: bestMsNow, isNewBest, session });
    go('finished');
  }, [go]);

  /** Start (or restart, from idle or the summary) a fresh run */
  const start = useCallback(() => {
    timesRef.current = [];
    runStartedAtRef.current = Date.now();
    setDoneCount(0);
    setLastMs(null);
    setResult(null);
    armWait();
  }, [armWait]);

  const tap = useCallback(() => {
    const p = phaseRef.current;
    if (p === 'idle') {
      start();
      return;
    }
    if (p === 'waiting') {
      // Too soon: void this attempt, show why, then retry the SAME trial
      setLastMs(null);
      go('tooSoon');
      arm(armWait, TOO_SOON_MS);
      return;
    }
    if (p === 'ready') {
      const ms = Math.round(performance.now() - greenAtRef.current);
      timesRef.current.push(ms);
      setDoneCount(timesRef.current.length);
      setLastMs(ms);
      if (timesRef.current.length >= trialsRef.current) finish();
      else {
        go('feedback');
        arm(armWait, FEEDBACK_MS);
      }
    }
    // 'tooSoon' | 'feedback' | 'finished': stray taps ignored
  }, [arm, armWait, finish, go, start]);

  // Green + hidden tab = elapsed time is meaningless: void the trial, re-wait
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && phaseRef.current === 'ready') armWait();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [armWait]);

  // Never advance phases after the screen unmounts
  useEffect(() => () => cancelTimerRef.current?.(), []);

  return { phase, doneCount, trials, lastMs, result, bestMs, start, tap };
}
