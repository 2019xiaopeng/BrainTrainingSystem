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
import { ARCADE_LIVES, knobsFor, normalizeDifficulty, normalizeRunMode } from '../lib/arcadeDifficulty';

// ---- Constants ----
const BEST_KEY = 'brain-flow-best:number-memory';
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
  /** Lives remaining (fixed = 1, endless = 3) */
  livesLeft: number;
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

  // Difficulty knobs + lives (fixed = 1 life, endless = 3; endless replays
  // the same length on a miss) — docs/arcade-difficulty-system.md
  const knobs = knobsFor('numberMemory', normalizeDifficulty(useGameStore((s) => s.arcadeModes.numberMemory?.difficulty)));
  const lives = ARCADE_LIVES[normalizeRunMode(useGameStore((s) => s.arcadeModes.numberMemory?.runMode))];
  const [livesLeft, setLivesLeft] = useState(lives);
  const livesRef = useRef(lives);
  const knobsRef = useRef(knobs);
  // keep refs fresh without writing them during render (React Compiler lint)
  useEffect(() => {
    knobsRef.current = knobs;
    livesRef.current = lives;
  });

  // ---- Phase timers (scheduleVisible: never advance while tab hidden) ----

  // showing → input when the memorize window (per-difficulty) is up
  useEffect(() => {
    if (phase !== 'showing' || digits === '') return;
    return scheduleVisible(() => {
      inputStartRef.current = Date.now();
      setPhase('input');
    }, knobsRef.current.showBaseMs + knobsRef.current.showPerDigitMs * digits.length);
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
        stimulusDuration: knobsRef.current.showBaseMs,
        interStimulusInterval: knobsRef.current.showPerDigitMs,
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
    // difficulty preset may raise the floor; the caller's config still wins if higher
    const sd = Math.max(
      MIN_START_DIGITS,
      Math.min(Math.max(startDigits, knobsRef.current.startDigits), MAX_START_DIGITS),
    );
    startDigitsRef.current = sd;
      setLivesLeft(lives);
    resultsRef.current = [];
    savedRef.current = false;
    startTimeRef.current = Date.now();
    setBest(readBest());
    setIsNewBest(false);
    setFinalLength(0);
    setInput('');
    setDigits(generateDigits(sd));
    setPhase('showing');
  }, [lives]);

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
    } else if (livesRef.current > 1) {
      // endless: lose a life, replay the SAME length with a fresh string
      livesRef.current -= 1;
      setLivesLeft(livesRef.current);
      playWrong();
      setDigits(generateDigits(digits.length));
      setInput('');
      setPhase('showing');
    } else {
      finishGame();
    }
  }, [phase, input, digits, playCorrect, playWrong, finishGame]);

  return {
    phase,
    digits,
    input,
    best,
    isNewBest,
    finalLength,
    livesLeft,
    startGame,
    retry,
    inputDigit,
    backspace,
    submit,
  };
}
