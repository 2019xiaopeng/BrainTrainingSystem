// ============================================================
// Brain Flow - Math Sprint (口算冲刺) Game Engine Hook
// ============================================================
//
// Timed mental-math sprint: answer `a op b` questions until the clock
// runs out. Correct → click sound, auto-advance; wrong → wrong sound,
// shake, same question stays. Every submit counts as one attempt.
//
// Hidden-tab safety: the countdown re-arms itself through
// scheduleVisible, which never fires while the tab is hidden — the
// clock only burns time the player can actually see and play.

import { useCallback, useEffect, useRef, useState } from 'react';
import { scheduleVisible } from '../lib/scheduleVisible';
import { useGameStore } from '../store/gameStore';
import { useSoundEffects } from './useSoundEffects';
import type { RoundResult, SessionSummary } from '../types/game';

// ---- Constants ----
const BEST_KEY = 'brain-flow-best:math-sprint';
const TICK_MS = 250;
const MIN_DURATION_SEC = 30;
const MAX_DURATION_SEC = 120;
const SOLVES_PER_TIER = 5;
const FLASH_MS = 450;
const MAX_INPUT_LEN = 3; // answers are ≤ 99; one spare digit for typos

type MathOp = '+' | '−' | '×';
const OPS: readonly MathOp[] = ['+', '−', '×'];

export interface MathQuestion {
  /** Incremental spawn index (React key / per-question animation) */
  index: number;
  a: number;
  b: number;
  op: MathOp;
  answer: number;
}

export type MathSprintPhase = 'idle' | 'playing' | 'finished';

interface AttemptRecord {
  userAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  reactionTimeMs: number;
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * a op b with non-negative integer results ≤ 99.
 * Operand range starts at 2-9 and grows +5 every 5 solved
 * (caps: +/− operands ≤ 49, × operands ≤ 12).
 */
function makeQuestion(solved: number, index: number): MathQuestion {
  const tier = Math.floor(solved / SOLVES_PER_TIER);
  const op = OPS[Math.floor(Math.random() * OPS.length)];
  const max = Math.min(9 + tier * 5, op === '×' ? 12 : 49);
  let a = randomInt(2, max);
  let b = randomInt(2, max);
  if (op === '−' && b > a) [a, b] = [b, a];
  while (op === '×' && a * b > 99) {
    a = randomInt(2, max);
    b = randomInt(2, max);
  }
  const answer = op === '+' ? a + b : op === '−' ? a - b : a * b;
  return { index, a, b, op, answer };
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

function writeBest(value: number): void {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(value));
  } catch {
    // Private mode / quota: best just won't persist
  }
}

// ---- The Hook ----

export function useMathSprintGame() {
  const [phase, setPhase] = useState<MathSprintPhase>('idle');
  const [question, setQuestion] = useState<MathQuestion | null>(null);
  const [input, setInput] = useState('');
  const [solved, setSolved] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [best, setBest] = useState(() => readBest());
  const [isNewBest, setIsNewBest] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);

  const phaseRef = useRef<MathSprintPhase>('idle');
  const remainingRef = useRef(0);
  const solvedRef = useRef(0);
  const qStartRef = useRef(0);
  const qIndexRef = useRef(0);
  const resultsRef = useRef<AttemptRecord[]>([]);
  const runStartRef = useRef(0);
  const savedRef = useRef(false);
  const durationSecRef = useRef(60);
  const tickCancelRef = useRef<(() => void) | null>(null);
  const flashCancelRef = useRef<(() => void) | null>(null);
  const lastTickAtRef = useRef(0);
  const visCleanupRef = useRef<(() => void) | null>(null);

  const { playClick, playWrong, playFinish, playRecord } = useSoundEffects();

  const go = useCallback((p: MathSprintPhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  /** Spawn the next question sized to the current solve count */
  const nextQuestion = useCallback(() => {
    qStartRef.current = Date.now();
    setQuestion(makeQuestion(solvedRef.current, qIndexRef.current));
    qIndexRef.current += 1;
    setInput('');
  }, []);

  const finish = useCallback(() => {
    tickCancelRef.current?.();
    flashCancelRef.current?.();
    visCleanupRef.current?.();
    visCleanupRef.current = null;

    const results = resultsRef.current;
    const attemptCount = results.length;
    const correct = results.filter((r) => r.isCorrect);
    const correctCount = correct.length;
    const prevBest = readBest();
    const newBest = correctCount > prevBest;
    if (newBest) writeBest(correctCount);
    setBest(newBest ? correctCount : prevBest);
    setIsNewBest(newBest);
    // record chime already celebrates; only play finish when it's not a record
    if (newBest) playRecord();
    else playFinish();

    const summary: SessionSummary = {
      config: {
        nLevel: 1,
        totalRounds: attemptCount,
        stimulusDuration: 0,
        interStimulusInterval: 0,
        stimulusType: 'number',
        mode: 'mathSprint',
        gridSize: 3,
      },
      rounds: results.map<RoundResult>((r, i) => ({
        targetStimulusIndex: i,
        correctAnswer: r.correctAnswer,
        userAnswer: r.userAnswer,
        isCorrect: r.isCorrect,
        reactionTimeMs: r.reactionTimeMs,
      })),
      totalRounds: attemptCount,
      correctCount,
      incorrectCount: attemptCount - correctCount,
      missedCount: 0,
      hits: correctCount,
      misses: 0,
      falseAlarms: attemptCount - correctCount,
      correctRejects: 0,
      accuracy: attemptCount > 0 ? Math.round((correctCount / attemptCount) * 1000) / 10 : 0,
      avgReactionTimeMs:
        correct.length > 0
          ? Math.round(correct.reduce((s, r) => s + r.reactionTimeMs, 0) / correct.length)
          : 0,
      durationMs: Date.now() - runStartRef.current,
    };

    if (!savedRef.current) {
      savedRef.current = true;
      useGameStore.getState().saveSession(summary);
    }

    setWrongFlash(false);
    go('finished');
  }, [go, playFinish, playRecord]);

  /** Start (or restart) a fresh run; arms the hidden-tab-safe countdown */
  const startGame = useCallback((durationSec: number) => {
    const ds = Math.max(MIN_DURATION_SEC, Math.min(durationSec, MAX_DURATION_SEC));
    durationSecRef.current = ds;
    tickCancelRef.current?.();
    flashCancelRef.current?.();
    resultsRef.current = [];
    solvedRef.current = 0;
    savedRef.current = false;
    runStartRef.current = Date.now();
    remainingRef.current = ds * 1000;
    setSolved(0);
    setAttempts(0);
    setBest(readBest());
    setIsNewBest(false);
    setWrongFlash(false);
    setDurationMs(ds * 1000);
    setTimeLeftMs(ds * 1000);
    nextQuestion();
    go('playing');

    // Countdown: delta-based ticks via scheduleVisible + a visibilitychange
    // handler, so only VISIBLE wall time is consumed. A fixed per-tick burn
    // would hand the player extra time whenever the browser throttles timers
    // (backgrounded-but-visible windows); a bare delta would charge hidden time.
    visCleanupRef.current?.();
    lastTickAtRef.current = performance.now();
    const tick = () => {
      if (phaseRef.current !== 'playing') return;
      const now = performance.now();
      remainingRef.current = Math.max(0, remainingRef.current - (now - lastTickAtRef.current));
      lastTickAtRef.current = now;
      setTimeLeftMs(remainingRef.current);
      if (remainingRef.current <= 0) {
        finish();
        return;
      }
      tickCancelRef.current?.();
      tickCancelRef.current = scheduleVisible(tick, TICK_MS);
    };
    const onVisibility = () => {
      const now = performance.now();
      if (document.hidden) {
        // Consume only the visible portion, then freeze the clock
        remainingRef.current = Math.max(0, remainingRef.current - (now - lastTickAtRef.current));
        lastTickAtRef.current = now;
        setTimeLeftMs(remainingRef.current);
        tickCancelRef.current?.();
        tickCancelRef.current = null;
      } else {
        lastTickAtRef.current = now;
        tickCancelRef.current?.();
        tickCancelRef.current = scheduleVisible(tick, TICK_MS);
      }
    };
    tickCancelRef.current?.();
    tickCancelRef.current = scheduleVisible(tick, TICK_MS);
    document.addEventListener('visibilitychange', onVisibility);
    visCleanupRef.current = () => document.removeEventListener('visibilitychange', onVisibility);
  }, [finish, go, nextQuestion]);

  const retry = useCallback(() => startGame(durationSecRef.current), [startGame]);

  const inputDigit = useCallback((digit: string) => {
    if (phaseRef.current !== 'playing') return;
    setWrongFlash(false);
    setInput((prev) => (prev.length >= MAX_INPUT_LEN ? prev : prev + digit));
  }, []);

  const backspace = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    setWrongFlash(false);
    setInput((prev) => prev.slice(0, -1));
  }, []);

  const submit = useCallback(() => {
    if (phaseRef.current !== 'playing' || input === '' || question === null) return;
    const userAnswer = Number(input);
    const isCorrect = userAnswer === question.answer;
    resultsRef.current.push({
      userAnswer,
      correctAnswer: question.answer,
      isCorrect,
      reactionTimeMs: Date.now() - qStartRef.current,
    });
    setAttempts(resultsRef.current.length);

    if (isCorrect) {
      playClick();
      solvedRef.current += 1;
      setSolved(solvedRef.current);
      nextQuestion();
    } else {
      playWrong();
      setInput('');
      setWrongFlash(true);
      flashCancelRef.current?.();
      flashCancelRef.current = scheduleVisible(() => setWrongFlash(false), FLASH_MS);
    }
  }, [input, question, nextQuestion, playClick, playWrong]);

  // Never fire timers or keep listeners after the screen unmounts
  useEffect(
    () => () => {
      tickCancelRef.current?.();
      flashCancelRef.current?.();
      visCleanupRef.current?.();
    },
    [],
  );

  return {
    phase,
    question,
    input,
    solved,
    attempts,
    timeLeftMs,
    durationMs,
    best,
    isNewBest,
    wrongFlash,
    startGame,
    retry,
    inputDigit,
    backspace,
    submit,
  };
}
