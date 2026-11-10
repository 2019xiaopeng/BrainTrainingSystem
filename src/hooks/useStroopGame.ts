// ============================================================
// Brain Flow - Stroop Test (色词冲突) Game Engine Hook
// ============================================================
//
// 60-second sprint: a color word printed in a different ink color
// (70% incongruent / 30% congruent). The player picks the INK color
// from 4 neutral-labeled buttons. Correct +1, wrong −1 (floor 0),
// next trial immediately. A soft flash/shake overlays the next trial.
//
// Hidden-tab safety: the countdown only consumes wall time while the
// tab is visible (visibilitychange freezes/resumes the tick chain, and
// the chain itself is scheduleVisible so nothing advances unseen).
// A hidden gap never inflates a reaction time either.

import { useCallback, useEffect, useRef, useState } from 'react';
import { scheduleVisible } from '../lib/scheduleVisible';
import type { NBackConfig, RoundResult, SessionSummary } from '../types/game';

export type StroopPhase = 'idle' | 'playing' | 'finished';
export type StroopFeedback = 'correct' | 'wrong' | null;
/** What answer() resolved to, so the screen can pick a sound */
export type StroopAnswerOutcome = 'correct' | 'wrong' | null;

export interface StroopTrial {
  /** Index into the 4 color words — the word's MEANING (the distractor) */
  wordIndex: number;
  /** Index into the 4 ink colors — what the player must actually pick */
  inkIndex: number;
}

export interface StroopResult {
  score: number;
  attempted: number;
  correct: number;
  /** Percentage 0-100 */
  accuracy: number;
  avgReactionTimeMs: number;
  /** Personal best after this run (null impossible after a run, kept for symmetry) */
  best: number | null;
  isNewBest: boolean;
  /** Synthesized session to hand to the global store */
  session: SessionSummary;
}

const BEST_KEY = 'brain-flow-best:stroop';
const COLOR_COUNT = 4;
const CONGRUENT_PROBABILITY = 0.3;
const TICK_MS = 200;
const FEEDBACK_MS = 400;

const clampDurationMs = (sec: number): number => Math.min(120, Math.max(30, sec)) * 1000;

function randomTrial(): StroopTrial {
  const wordIndex = Math.floor(Math.random() * COLOR_COUNT);
  if (Math.random() < CONGRUENT_PROBABILITY) return { wordIndex, inkIndex: wordIndex };
  // Incongruent: any of the other three inks
  const inkIndex = (wordIndex + 1 + Math.floor(Math.random() * (COLOR_COUNT - 1))) % COLOR_COUNT;
  return { wordIndex, inkIndex };
}

function loadBest(): number | null {
  try {
    const v = JSON.parse(localStorage.getItem(BEST_KEY) ?? 'null');
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
  } catch {
    return null;
  }
}

function saveBest(score: number): void {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(score));
  } catch {
    // Storage unavailable (private mode): best simply won't persist
  }
}

export function useStroopGame(durationSec: number) {
  const totalMs = clampDurationMs(durationSec);

  const [phase, setPhase] = useState<StroopPhase>('idle');
  const [trial, setTrial] = useState<StroopTrial>(() => randomTrial());
  /** Bumped every trial — the screen keys its card animation on it */
  const [trialIndex, setTrialIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [feedback, setFeedback] = useState<StroopFeedback>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(totalMs);
  const [result, setResult] = useState<StroopResult | null>(null);
  const [best, setBest] = useState<number | null>(() => loadBest());

  const phaseRef = useRef<StroopPhase>('idle');
  const trialRef = useRef(trial);
  const trialStartRef = useRef(0);
  const scoreRef = useRef(0);
  const roundsRef = useRef<RoundResult[]>([]);
  const remainingMsRef = useRef(totalMs);
  const lastTickAtRef = useRef(0);
  const runStartedAtRef = useRef(0);
  const cancelTickRef = useRef<(() => void) | null>(null);
  const cancelFeedbackRef = useRef<(() => void) | null>(null);
  const finishRef = useRef<() => void>(() => {});

  const go = useCallback((p: StroopPhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const nextTrial = useCallback(() => {
    const t = randomTrial();
    trialRef.current = t;
    trialStartRef.current = performance.now();
    setTrial(t);
    setTrialIndex((i) => i + 1);
  }, []);

  const finish = useCallback(() => {
    cancelFeedbackRef.current?.();
    setFeedback(null);

    const rounds = roundsRef.current;
    const attemptedNow = rounds.length;
    const correct = rounds.filter((r) => r.isCorrect).length;
    const wrong = attemptedNow - correct;
    const finalScore = scoreRef.current;
    const accuracy = attemptedNow > 0 ? Math.round((correct / attemptedNow) * 100) : 0;
    const avgReactionTimeMs =
      attemptedNow > 0
        ? Math.round(rounds.reduce((s, r) => s + (r.reactionTimeMs ?? 0), 0) / attemptedNow)
        : 0;
    const prevBest = loadBest();
    const isNewBest = prevBest === null || finalScore > prevBest;
    if (isNewBest) saveBest(finalScore);
    const bestNow: number | null = isNewBest ? finalScore : prevBest;

    const config: NBackConfig = {
      mode: 'stroop',
      nLevel: 1,
      totalRounds: attemptedNow,
      stimulusDuration: 0,
      interStimulusInterval: 0,
      stimulusType: 'number',
      gridSize: 3,
    };
    const session: SessionSummary = {
      config,
      rounds,
      totalRounds: attemptedNow,
      correctCount: correct,
      incorrectCount: wrong,
      missedCount: 0,
      hits: correct,
      misses: 0,
      falseAlarms: wrong,
      correctRejects: 0,
      accuracy,
      avgReactionTimeMs,
      durationMs: Date.now() - runStartedAtRef.current,
      timestamp: Date.now(),
    };

    setBest(bestNow);
    setResult({
      score: finalScore,
      attempted: attemptedNow,
      correct,
      accuracy,
      avgReactionTimeMs,
      best: bestNow,
      isNewBest,
      session,
    });
    go('finished');
  }, [go]);

  // Latest finish for the tick chain (ref written in an effect, never during render)
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  /** Start (or restart from the summary) a fresh timed run */
  const start = useCallback(() => {
    cancelTickRef.current?.();
    cancelFeedbackRef.current?.();
    roundsRef.current = [];
    scoreRef.current = 0;
    remainingMsRef.current = totalMs;
    runStartedAtRef.current = Date.now();
    setScore(0);
    setAttempted(0);
    setFeedback(null);
    setTimeLeftMs(totalMs);
    setResult(null);
    nextTrial();
    go('playing');
  }, [go, nextTrial, totalMs]);

  const answer = useCallback(
    (index: number): StroopAnswerOutcome => {
      if (phaseRef.current !== 'playing') return null;
      const t = trialRef.current;
      const isCorrect = index === t.inkIndex;
      const reactionTimeMs = Math.round(performance.now() - trialStartRef.current);
      roundsRef.current.push({
        targetStimulusIndex: roundsRef.current.length,
        correctAnswer: t.inkIndex,
        userAnswer: index,
        isCorrect,
        reactionTimeMs,
      });
      scoreRef.current = isCorrect ? scoreRef.current + 1 : Math.max(0, scoreRef.current - 1);
      setScore(scoreRef.current);
      setAttempted(roundsRef.current.length);
      setFeedback(isCorrect ? 'correct' : 'wrong');
      cancelFeedbackRef.current?.();
      cancelFeedbackRef.current = scheduleVisible(() => setFeedback(null), FEEDBACK_MS);
      nextTrial();
      return isCorrect ? 'correct' : 'wrong';
    },
    [nextTrial],
  );

  // Countdown: one scheduleVisible chain, paused on hidden / resumed on visible
  // so a hidden tab never eats the clock (deltas only count visible time).
  useEffect(() => {
    if (phase !== 'playing') return;
    lastTickAtRef.current = performance.now();

    const tick = () => {
      const now = performance.now();
      remainingMsRef.current = Math.max(0, remainingMsRef.current - (now - lastTickAtRef.current));
      lastTickAtRef.current = now;
      setTimeLeftMs(remainingMsRef.current);
      if (remainingMsRef.current <= 0) {
        finishRef.current();
        return;
      }
      cancelTickRef.current = scheduleVisible(tick, TICK_MS);
    };

    const onVisibility = () => {
      const now = performance.now();
      if (document.hidden) {
        // Consume only the visible portion, then kill the chain: clock frozen
        remainingMsRef.current = Math.max(0, remainingMsRef.current - (now - lastTickAtRef.current));
        lastTickAtRef.current = now;
        cancelTickRef.current?.();
        cancelTickRef.current = null;
        setTimeLeftMs(remainingMsRef.current);
      } else {
        lastTickAtRef.current = now;
        trialStartRef.current = now; // the hidden gap must not inflate reaction times
        cancelTickRef.current = scheduleVisible(tick, TICK_MS);
      }
    };

    cancelTickRef.current = scheduleVisible(tick, TICK_MS);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelTickRef.current?.();
      cancelTickRef.current = null;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [phase]);

  // Never fire the feedback flash clear after unmount
  useEffect(() => () => cancelFeedbackRef.current?.(), []);

  return {
    phase,
    trial,
    trialIndex,
    score,
    attempted,
    feedback,
    timeLeftMs,
    totalMs,
    result,
    best,
    start,
    answer,
  };
}
