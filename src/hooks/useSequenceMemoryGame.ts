// ============================================================
// Brain Flow - Sequence Memory (顺序记忆) Game Engine Hook
// ============================================================
//
// Humanbenchmark-style grid sequence. Per level:
//   showing  → cells flash one at a time (600ms lit + 250ms gap)
//   input    → player clicks the cells back in the same order
//   feedback → correct: ~0.8s cue, sequence extended by one cell
//              wrong:   game over (reveal which step failed)
//   finished → final sequence length + personal best
//
// Each level's sequence is the previous one EXTENDED by one random
// cell (classic behavior). Personal best lives in localStorage
// (`brain-flow-best:sequence-memory`), NOT in the game store.
// Every timer goes through scheduleVisible so a hidden tab never
// advances flashes or burns the memorize phase unseen.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoundResult, SessionSummary } from '../types/game';
import { DEFAULT_CONFIG } from '../types/game';
import { useGameStore } from '../store/gameStore';
import { useSoundEffects } from './useSoundEffects';
import { scheduleVisible } from '../lib/scheduleVisible';

// ---- Constants ----
const BEST_KEY = 'brain-flow-best:sequence-memory';
const LIT_MS = 600;
const GAP_MS = 250;
const FEEDBACK_MS = 800;
const PICK_FLASH_MS = 200;
const MIN_GRID = 3;
const MAX_GRID = 5;

// ---- Pure helpers ----

/** Random cell index on a size×size grid */
function randomCell(size: number): number {
  return Math.floor(Math.random() * size * size);
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

export type SequenceMemoryPhase = 'idle' | 'showing' | 'input' | 'feedback' | 'finished';

interface LevelResult {
  isCorrect: boolean;
  reactionTimeMs: number;
}

export interface UseSequenceMemoryGameReturn {
  phase: SequenceMemoryPhase;
  /** Cell indices of the current level's sequence (grid is size×size) */
  sequence: number[];
  /** Currently highlighted cell (-1 = none): showing flash or correct-pick flash */
  lit: number;
  /** How many cells of the sequence were correctly picked this level */
  inputIdx: number;
  /** Personal best sequence length (updated at game over) */
  best: number;
  /** Whether the just-finished run set a new personal best */
  isNewBest: boolean;
  /** Final sequence length = highest level fully repeated */
  finalLength: number;
  /** The wrong cell clicked on the fatal miss (null until game over) */
  wrongCell: number | null;

  startGame: (gridSize: number) => void;
  retry: () => void;
  pressCell: (cell: number) => void;
}

// ---- The Hook ----

export function useSequenceMemoryGame(): UseSequenceMemoryGameReturn {
  const [phase, setPhase] = useState<SequenceMemoryPhase>('idle');
  const [sequence, setSequence] = useState<number[]>([]);
  const [lit, setLit] = useState(-1);
  const [showIdx, setShowIdx] = useState(0);
  const [inputIdx, setInputIdx] = useState(0);
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const [best, setBest] = useState(() => readBest());
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalLength, setFinalLength] = useState(0);

  const resultsRef = useRef<LevelResult[]>([]);
  const gridSizeRef = useRef(3);
  const startTimeRef = useRef(0);
  const inputStartRef = useRef(0);
  const savedRef = useRef(false);
  const flashCancelRef = useRef<(() => void) | null>(null);

  const { playClick, playCorrect, playWrong, playFinish, playRecord } = useSoundEffects();

  // ---- Phase timers (scheduleVisible: never advance while tab hidden) ----

  // One step of the showing phase: light sequence[showIdx] for LIT_MS,
  // keep the trailing GAP_MS dark, then advance. Keyed on scalars only;
  // the light-on runs inside a 0ms timer so a re-run (StrictMode) can
  // never double-fire a flash or its sound.
  useEffect(() => {
    if (phase !== 'showing') return;
    if (showIdx >= sequence.length) {
      // Whole sequence presented → let the trailing gap play, then input
      return scheduleVisible(() => {
        inputStartRef.current = Date.now();
        setPhase('input');
      }, GAP_MS);
    }
    const on = scheduleVisible(() => {
      setLit(sequence[showIdx]);
      playClick();
    }, 0);
    const off = scheduleVisible(() => setLit(-1), LIT_MS);
    const next = scheduleVisible(() => setShowIdx((i) => i + 1), LIT_MS + GAP_MS);
    return () => {
      on();
      off();
      next();
    };
  }, [phase, showIdx, sequence, playClick]);

  // feedback (level cleared) → next level: same sequence + one new cell
  useEffect(() => {
    if (phase !== 'feedback') return;
    return scheduleVisible(() => {
      setSequence((s) => [...s, randomCell(gridSizeRef.current)]);
      setShowIdx(0);
      setInputIdx(0);
      setPhase('showing');
    }, FEEDBACK_MS);
  }, [phase]);

  // Cancel any pending correct-pick flash on unmount
  useEffect(() => () => flashCancelRef.current?.(), []);

  /** Soft brief highlight of a correctly picked cell */
  const flashPick = useCallback((cell: number) => {
    flashCancelRef.current?.();
    setLit(cell);
    flashCancelRef.current = scheduleVisible(() => setLit(-1), PICK_FLASH_MS);
  }, []);

  // ---- Game over ----

  const finishGame = useCallback(() => {
    playWrong();

    const results = resultsRef.current;
    const attempts = results.length;
    const passed = results.filter((r) => r.isCorrect).length;
    // Levels start at length 1, so the highest cleared length equals the
    // number of cleared levels.
    const final = passed;
    const prevBest = readBest();
    const newBest = final > prevBest;
    if (newBest) writeBest(final);

    setLit(-1);
    setFinalLength(final);
    setIsNewBest(newBest);
    setBest(newBest ? final : prevBest);
    // record chime already celebrates; only play finish when it's not a record
    if (newBest) playRecord();
    else playFinish();

    const nbackRounds: RoundResult[] = results.map((r, i) => ({
      targetStimulusIndex: i,
      correctAnswer: 1,
      userAnswer: r.isCorrect ? 1 : 0,
      isCorrect: r.isCorrect,
      reactionTimeMs: r.reactionTimeMs,
    }));

    const summary: SessionSummary = {
      config: {
        ...DEFAULT_CONFIG,
        mode: 'sequence',
        nLevel: final,
        totalRounds: attempts,
        stimulusDuration: LIT_MS,
        interStimulusInterval: GAP_MS,
        stimulusType: 'number',
        gridSize: gridSizeRef.current,
      },
      rounds: nbackRounds,
      totalRounds: attempts,
      correctCount: passed,
      incorrectCount: attempts - passed,
      missedCount: 0,
      hits: passed,
      misses: 0,
      falseAlarms: attempts - passed,
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

  const startGame = useCallback((gridSize: number) => {
    gridSizeRef.current = Math.max(MIN_GRID, Math.min(MAX_GRID, Math.round(gridSize)));
    resultsRef.current = [];
    savedRef.current = false;
    startTimeRef.current = Date.now();
    setBest(readBest());
    setIsNewBest(false);
    setFinalLength(0);
    setWrongCell(null);
    setInputIdx(0);
    setShowIdx(0);
    setLit(-1);
    setSequence([randomCell(gridSizeRef.current)]);
    setPhase('showing');
  }, []);

  const retry = useCallback(() => startGame(gridSizeRef.current), [startGame]);

  const pressCell = useCallback(
    (cell: number) => {
      if (phase !== 'input') return;
      if (cell === sequence[inputIdx]) {
        // Correct pick: soft flash; last one clears the level
        flashPick(cell);
        if (inputIdx + 1 >= sequence.length) {
          resultsRef.current.push({
            isCorrect: true,
            reactionTimeMs: Date.now() - inputStartRef.current,
          });
          playCorrect();
          setPhase('feedback');
        } else {
          playClick();
          setInputIdx(inputIdx + 1);
        }
      } else {
        resultsRef.current.push({
          isCorrect: false,
          reactionTimeMs: Date.now() - inputStartRef.current,
        });
        setWrongCell(cell);
        finishGame();
      }
    },
    [phase, sequence, inputIdx, flashPick, playClick, playCorrect, finishGame],
  );

  return {
    phase,
    sequence,
    lit,
    inputIdx,
    best,
    isNewBest,
    finalLength,
    wrongCell,
    startGame,
    retry,
    pressCell,
  };
}
