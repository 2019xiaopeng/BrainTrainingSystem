// ============================================================
// Brain Flow - Number Memory (数字记忆) Game Engine Hook
// ============================================================
//
// Endless digit-span game. Per level:
//   showing  → digits displayed for 1000ms + 400ms/digit
//   input    → player types the digits back (keypad or keyboard)
//   feedback → correct: ~0.9s cue, +1 digit, next level
//              wrong:   game over (reveal correct vs answer)
//   finished → final digit length + personal best
//
// Personal best lives in localStorage (`brain-flow-best:number-memory`),
// NOT in the game store. Timers use scheduleVisible so a hidden tab
// never burns the memorize window unseen.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoundResult, SessionSummary } from '../types/game';
import { DEFAULT_CONFIG } from '../types/game';
import { useGameStore } from '../store/gameStore';
import { useSoundEffects } from './useSoundEffects';
import { scheduleVisible } from '../lib/scheduleVisible';

// ---- Constants ----
const BEST_KEY = 'brain-flow-best:number-memory';
const SHOW_BASE_MS = 1000;
const SHOW_PER_DIGIT_MS = 400;
const FEEDBACK_MS = 900;
const MAX_INPUT_LEN = 30;
const MIN_START_DIGITS = 1;
const MAX_START_DIGITS = 16;

// ---- Pure helpers ----

/** Random digits: first 1-9 (no leading zero), rest 0-9 */
function generateDigits(length: number): string {
  let s = String(1 + Math.floor(Math.random() * 9));
  for (let i = 1; i < length; i++) s += Math.floor(Math.random() * 10);
  return s;
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

// ---- Hook types ----

export type NumberMemoryPhase = 'idle' | 'showing' | 'input' | 'feedback' | 'finished';

interface LevelResult {
  target: string;
  input: string;
  isCorrect: boolean;
  reactionTimeMs: number;
}

export interface UseNumberMemoryGameReturn {
  phase: NumberMemoryPhase;
  /** Current digit string (during play: the target; after game over: the failed one) */
  digits: string;
  /** Digits typed so far (after game over: the failed attempt) */
  input: string;
  /** Personal best digit length (updated at game over) */
  best: number;
  /** Whether the just-finished run set a new personal best */
  isNewBest: boolean;
  /** Final digit length = highest length correctly recalled */
  finalLength: number;

  startGame: (startDigits: number) => void;
  retry: () => void;
  inputDigit: (digit: string) => void;
  backspace: () => void;
  submit: () => void;
}

// ---- The Hook ----

export function useNumberMemoryGame(): UseNumberMemoryGameReturn {
  const [phase, setPhase] = useState<NumberMemoryPhase>('idle');
  const [digits, setDigits] = useState('');
  const [input, setInput] = useState('');
  const [best, setBest] = useState(() => readBest());
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalLength, setFinalLength] = useState(0);

  const resultsRef = useRef<LevelResult[]>([]);
  const startDigitsRef = useRef(3);
  const startTimeRef = useRef(0);
  const inputStartRef = useRef(0);
  const savedRef = useRef(false);

  const { playCorrect, playWrong, playFinish, playRecord } = useSoundEffects();

  // ---- Phase timers (scheduleVisible: never advance while tab hidden) ----

  // showing → input when the memorize window (1000ms + 400ms/digit) is up
  useEffect(() => {
    if (phase !== 'showing' || digits === '') return;
    return scheduleVisible(() => {
      inputStartRef.current = Date.now();
      setPhase('input');
    }, SHOW_BASE_MS + SHOW_PER_DIGIT_MS * digits.length);
  }, [phase, digits]);

  // feedback (correct) → next level after a brief cue
  useEffect(() => {
    if (phase !== 'feedback') return;
    const nextLength = digits.length + 1;
    return scheduleVisible(() => {
      setDigits(generateDigits(nextLength));
      setInput('');
      setPhase('showing');
    }, FEEDBACK_MS);
  }, [phase, digits]);

  // ---- Game over ----

  const finishGame = useCallback(() => {
    playWrong();

    const results = resultsRef.current;
    const attempts = results.length;
    const passed = results.filter((r) => r.isCorrect).length;
    const final = passed > 0 ? startDigitsRef.current + passed - 1 : 0;
    const prevBest = readBest();
    const newBest = final > prevBest;
    if (newBest) writeBest(final);

    setFinalLength(final);
    setIsNewBest(newBest);
    setBest(newBest ? final : prevBest);
    // record chime already celebrates; only play finish when it's not a record
    if (newBest) playRecord();
    else playFinish();

    const nbackRounds: RoundResult[] = results.map((r, i) => ({
      targetStimulusIndex: i,
      correctAnswer: r.target.length,
      userAnswer: r.input === '' ? null : Number(r.input),
      isCorrect: r.isCorrect,
      reactionTimeMs: r.reactionTimeMs,
    }));

    const summary: SessionSummary = {
      config: {
        ...DEFAULT_CONFIG,
        mode: 'numberMemory',
        nLevel: final,
        totalRounds: attempts,
        stimulusDuration: SHOW_BASE_MS,
        interStimulusInterval: SHOW_PER_DIGIT_MS,
        stimulusType: 'number',
        gridSize: 3,
      },
      rounds: nbackRounds,
      totalRounds: attempts,
      correctCount: passed,
      incorrectCount: attempts - passed,
      missedCount: 0,
      hits: passed,
      misses: 0,
      falseAlarms: 0,
      correctRejects: 0,
      accuracy: attempts > 0 ? Math.round((passed / attempts) * 1000) / 10 : 0,
      avgReactionTimeMs:
        attempts > 0
          ? Math.round(results.reduce((sum, r) => sum + r.reactionTimeMs, 0) / attempts)
          : 0,
      durationMs: Date.now() - startTimeRef.current,
    };

    if (!savedRef.current) {
      savedRef.current = true;
      useGameStore.getState().saveSession(summary);
    }

    setPhase('finished');
  }, [playWrong, playRecord, playFinish]);

  // ---- Actions ----

  const startGame = useCallback((startDigits: number) => {
    const sd = Math.max(MIN_START_DIGITS, Math.min(startDigits, MAX_START_DIGITS));
    startDigitsRef.current = sd;
    resultsRef.current = [];
    savedRef.current = false;
    startTimeRef.current = Date.now();
    setBest(readBest());
    setIsNewBest(false);
    setFinalLength(0);
    setInput('');
    setDigits(generateDigits(sd));
    setPhase('showing');
  }, []);

  const retry = useCallback(() => startGame(startDigitsRef.current), [startGame]);

  const inputDigit = useCallback(
    (digit: string) => {
      if (phase !== 'input') return;
      setInput((prev) => (prev.length >= MAX_INPUT_LEN ? prev : prev + digit));
    },
    [phase],
  );

  const backspace = useCallback(() => {
    if (phase !== 'input') return;
    setInput((prev) => prev.slice(0, -1));
  }, [phase]);

  const submit = useCallback(() => {
    if (phase !== 'input' || input === '') return;
    const isCorrect = input === digits;
    resultsRef.current.push({
      target: digits,
      input,
      isCorrect,
      reactionTimeMs: Date.now() - inputStartRef.current,
    });

    if (isCorrect) {
      playCorrect();
      setPhase('feedback');
    } else {
      finishGame();
    }
  }, [phase, input, digits, playCorrect, finishGame]);

  return {
    phase,
    digits,
    input,
    best,
    isNewBest,
    finalLength,
    startGame,
    retry,
    inputDigit,
    backspace,
    submit,
  };
}
