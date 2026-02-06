// ============================================================
// Brain Flow - Devilish Mice (魔鬼老鼠) Game Engine Hook
// ============================================================
//
// Separate game engine from N-Back.
// Each round is a self-contained puzzle with 5 phases:
//   A. Memorize (revealing): show mice & cats on grid, 3s countdown
//   B. Cover (covering): hide all animals behind identical covers
//   C. Shift (pushing): cats enter from edges, shifting rows/columns
//   D. Answer (answering): player clicks cells to find mice
//   E. Reveal (feedback): uncover all, show results
//
// Grid is FULLY filled: N mice + rest all cats (no empty cells).
// Push generation protects mice from being pushed off when possible.

import { useCallback, useRef, useState } from 'react';
import type {
  NBackConfig,
  SessionSummary,
  RoundResult,
  PushOperation,
  GridCell,
  MousePuzzle,
  MouseRoundResult,
  MouseGameConfig,
} from '../types/game';
import { DEFAULT_CONFIG } from '../types/game';

// ---- Helper: unique ID generator ----
let _cellIdCounter = 0;
function nextCellId(): string {
  return `cell-${++_cellIdCounter}`;
}

// ---- Pure functions ----

/** Create a fully filled grid: numMice mice + rest cats, randomly placed */
function createFilledGrid(cols: number, rows: number, numMice: number): GridCell[] {
  const total = cols * rows;
  const clampedMice = Math.min(numMice, total);

  // Create content array: first N are mice, rest are cats
  const contents: ('mouse' | 'cat')[] = [];
  for (let i = 0; i < clampedMice; i++) contents.push('mouse');
  for (let i = clampedMice; i < total; i++) contents.push('cat');

  // Fisher-Yates shuffle
  for (let i = contents.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [contents[i], contents[j]] = [contents[j], contents[i]];
  }

  return contents.map((c) => ({ id: nextCellId(), content: c }));
}

/**
 * Generate push operations ensuring at least ⌈N/2⌉ mice survive.
 * Uses smart retry logic to avoid pushing too many mice off.
 */
function generatePushOps(
  initialGrid: GridCell[],
  cols: number,
  rows: number,
  numPushes: number,
  targetMice: number,
): PushOperation[] {
  const minSurvivingMice = Math.ceil(targetMice / 2);
  const MAX_ATTEMPTS = 100;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const ops: PushOperation[] = [];
    const sides: PushOperation['side'][] = ['left', 'right', 'top', 'bottom'];
    let currentGrid = initialGrid.map((c) => ({ ...c }));

    // Generate random pushes
    for (let i = 0; i < numPushes; i++) {
      const side = sides[Math.floor(Math.random() * sides.length)];
      const maxLine = (side === 'left' || side === 'right') ? rows : cols;
      const lineIndex = Math.floor(Math.random() * maxLine);
      ops.push({ side, lineIndex });
      currentGrid = applyPush(currentGrid, cols, rows, { side, lineIndex });
    }

    // Check survival rate
    const survivingMice = currentGrid.filter((c) => c.content === 'mouse').length;
    if (survivingMice >= minSurvivingMice) {
      return ops;
    }
  }

  // Fallback: return empty array (no pushes)
  console.warn(`Could not find push sequence preserving ${minSurvivingMice} mice, using no pushes`);
  return [];
}

/** Apply all pushes sequentially and return the final grid */
function applyAllPushes(
  initialGrid: GridCell[],
  cols: number,
  rows: number,
  pushOps: PushOperation[],
): GridCell[] {
  let grid = initialGrid.map((c) => ({ ...c }));
  for (const push of pushOps) {
    grid = applyPush(grid, cols, rows, push);
  }
  return grid;
}

/**
 * Apply a single push operation to the grid.
 * Returns a NEW grid with the push applied.
 */
function applyPush(
  grid: GridCell[],
  cols: number,
  rows: number,
  push: PushOperation,
): GridCell[] {
  const newGrid = grid.map((c) => ({ ...c }));
  const { side, lineIndex } = push;

  if (side === 'left') {
    const row = lineIndex;
    for (let c = cols - 1; c > 0; c--) {
      newGrid[row * cols + c] = { ...newGrid[row * cols + (c - 1)] };
    }
    newGrid[row * cols] = { id: nextCellId(), content: 'cat' };
  } else if (side === 'right') {
    const row = lineIndex;
    for (let c = 0; c < cols - 1; c++) {
      newGrid[row * cols + c] = { ...newGrid[row * cols + (c + 1)] };
    }
    newGrid[row * cols + (cols - 1)] = { id: nextCellId(), content: 'cat' };
  } else if (side === 'top') {
    const col = lineIndex;
    for (let r = rows - 1; r > 0; r--) {
      newGrid[r * cols + col] = { ...newGrid[(r - 1) * cols + col] };
    }
    newGrid[col] = { id: nextCellId(), content: 'cat' };
  } else {
    const col = lineIndex;
    for (let r = 0; r < rows - 1; r++) {
      newGrid[r * cols + col] = { ...newGrid[(r + 1) * cols + col] };
    }
    newGrid[(rows - 1) * cols + col] = { id: nextCellId(), content: 'cat' };
  }

  return newGrid;
}

/** Generate a complete puzzle from MouseGameConfig */
function generatePuzzle(config: MouseGameConfig): MousePuzzle {
  const { cols, rows, numMice, numPushes } = config;

  const initialCells = createFilledGrid(cols, rows, numMice);
  const pushOps = generatePushOps(initialCells, cols, rows, numPushes, numMice);
  const finalCells = applyAllPushes(initialCells, cols, rows, pushOps);

  const mousePositions = finalCells
    .map((cell, i) => (cell.content === 'mouse' ? i : -1))
    .filter((i) => i !== -1);

  const survivingMice = mousePositions.length;
  const lostMice = numMice - survivingMice;

  return {
    cols,
    rows,
    initialCells: initialCells.map((c) => ({ ...c })),
    pushOps,
    finalCells,
    mousePositions,
    totalMice: survivingMice,
    lostMice,
    initialMiceCount: numMice,
  };
}

/** Compute intermediate grids after each push (for animation) */
export function computePushSteps(
  initialCells: GridCell[],
  cols: number,
  rows: number,
  pushOps: PushOperation[],
): GridCell[][] {
  const steps: GridCell[][] = [initialCells.map((c) => ({ ...c }))];
  let current = initialCells.map((c) => ({ ...c }));
  for (const push of pushOps) {
    current = applyPush(current, cols, rows, push);
    steps.push(current.map((c) => ({ ...c })));
  }
  return steps;
}

/** Detail of a single push: what enters, what exits, which cells are on the affected line */
export interface PushDetail {
  push: PushOperation;
  /** Grid state BEFORE this push */
  beforeGrid: GridCell[];
  /** Grid state AFTER this push */
  afterGrid: GridCell[];
  /** The cell that gets pushed off (exits the grid) */
  exitingCell: GridCell;
  /** Flat index of the exiting cell in the BEFORE grid */
  exitingIndex: number;
  /** The new cat cell that enters */
  enteringCell: GridCell;
  /** Flat indices of cells on the affected line (in BEFORE grid order, entry→exit direction) */
  lineIndices: number[];
}

/** Compute detailed push info for each push operation */
export function computePushDetails(
  initialCells: GridCell[],
  cols: number,
  rows: number,
  pushOps: PushOperation[],
): PushDetail[] {
  const details: PushDetail[] = [];
  let current = initialCells.map((c) => ({ ...c }));

  for (const push of pushOps) {
    const before = current.map((c) => ({ ...c }));
    const { side, lineIndex } = push;

    // Figure out which cell exits and get line indices
    let exitingIndex: number;
    let lineIndices: number[];

    if (side === 'left') {
      // Cat enters from left, pushes right → rightmost exits
      exitingIndex = lineIndex * cols + (cols - 1);
      lineIndices = Array.from({ length: cols }, (_, c) => lineIndex * cols + c);
    } else if (side === 'right') {
      // Cat enters from right, pushes left → leftmost exits
      exitingIndex = lineIndex * cols;
      lineIndices = Array.from({ length: cols }, (_, c) => lineIndex * cols + (cols - 1 - c));
    } else if (side === 'top') {
      // Cat enters from top, pushes down → bottommost exits
      exitingIndex = (rows - 1) * cols + lineIndex;
      lineIndices = Array.from({ length: rows }, (_, r) => r * cols + lineIndex);
    } else {
      // Cat enters from bottom, pushes up → topmost exits
      exitingIndex = lineIndex;
      lineIndices = Array.from({ length: rows }, (_, r) => (rows - 1 - r) * cols + lineIndex);
    }

    const exitingCell = { ...before[exitingIndex] };

    // Apply the push
    current = applyPush(current, cols, rows, push);
    const after = current.map((c) => ({ ...c }));

    // Find the entering cell (the new cat that was created)
    let enterIndex: number;
    if (side === 'left') enterIndex = lineIndex * cols;
    else if (side === 'right') enterIndex = lineIndex * cols + (cols - 1);
    else if (side === 'top') enterIndex = lineIndex;
    else enterIndex = (rows - 1) * cols + lineIndex;

    const enteringCell = { ...after[enterIndex] };

    details.push({
      push,
      beforeGrid: before,
      afterGrid: after,
      exitingCell,
      exitingIndex,
      enteringCell,
      lineIndices,
    });
  }

  return details;
}

// ---- Hook types ----

export type MouseGamePhase =
  | 'idle'
  | 'revealing'     // Phase A: Doors open, showing animals, countdown
  | 'covering'      // Phase B: Doors closing → identical covers
  | 'pushing'       // Phase C: Push animations in progress (one at a time)
  | 'answering'     // Phase D: Player selecting cells
  | 'feedback'      // Phase E: Show results
  | 'finished';     // All rounds done

export interface UseMouseGameReturn {
  phase: MouseGamePhase;
  /** Current puzzle */
  puzzle: MousePuzzle | null;
  /** Current round (0-based) */
  currentRound: number;
  /** Total rounds */
  totalRounds: number;
  /** Mouse game config */
  mouseConfig: MouseGameConfig;
  /** Which push we're currently animating (0-based, during 'pushing' phase) */
  currentPushIndex: number;
  /** All round results */
  roundResults: MouseRoundResult[];
  /** Session summary (when finished) */
  summary: SessionSummary | null;
  /** NBackConfig (for compatibility with ResultScreen) */
  config: NBackConfig;

  // Actions
  startGame: (mouseConfig: MouseGameConfig) => void;
  onRevealComplete: () => void;
  onCoverComplete: () => void;
  onPushAnimComplete: () => void;
  submitAnswer: (selectedCells: number[]) => void;
  onFeedbackComplete: () => void;
  resetGame: () => void;
}

// ---- The Hook ----

const DEFAULT_MOUSE_CONFIG: MouseGameConfig = {
  numMice: 3,
  cols: 4,
  rows: 3,
  numPushes: 3,
  totalRounds: 5,
  revealDuration: 3000,
};

export function useMouseGame(): UseMouseGameReturn {
  const [phase, setPhase] = useState<MouseGamePhase>('idle');
  const [nbackConfig, setNbackConfig] = useState<NBackConfig>(DEFAULT_CONFIG);
  const [mouseConfig, setMouseConfig] = useState<MouseGameConfig>(DEFAULT_MOUSE_CONFIG);
  const [puzzles, setPuzzles] = useState<MousePuzzle[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentPushIndex, setCurrentPushIndex] = useState(0);
  const [roundResults, setRoundResults] = useState<MouseRoundResult[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  const startTimeRef = useRef(0);

  const currentPuzzle = puzzles[currentRound] ?? null;
  const totalRounds = mouseConfig.totalRounds;

  // ---- Build SessionSummary (compatible with ResultScreen) ----
  const buildMouseSummary = useCallback(
    (results: MouseRoundResult[], cfg: NBackConfig): SessionSummary => {
      const endTime = Date.now();

      const nbackRounds: RoundResult[] = results.map((r, i) => ({
        targetStimulusIndex: i,
        correctAnswer: r.mousePositions[0] ?? -1,
        userAnswer: r.selectedCells[0] ?? null,
        isCorrect: r.correctCount === r.totalMice && r.wrongSelections === 0,
        reactionTimeMs: null,
      }));

      const totalMiceAcrossRounds = results.reduce((sum, r) => sum + r.totalMice, 0);
      const totalCorrect = results.reduce((sum, r) => sum + r.correctCount, 0);
      const perfectRounds = results.filter(
        (r) => r.correctCount === r.totalMice && r.wrongSelections === 0,
      ).length;
      const incorrectRounds = results.length - perfectRounds;
      const accuracy =
        totalMiceAcrossRounds > 0
          ? Math.round((totalCorrect / totalMiceAcrossRounds) * 1000) / 10
          : 0;

      return {
        config: cfg,
        rounds: nbackRounds,
        totalRounds: results.length,
        correctCount: perfectRounds,
        incorrectCount: incorrectRounds,
        missedCount: 0,
        hits: perfectRounds,
        misses: 0,
        falseAlarms: incorrectRounds,
        correctRejects: 0,
        accuracy,
        avgReactionTimeMs: 0,
        durationMs: endTime - startTimeRef.current,
      };
    },
    [],
  );

  // ---- Actions ----

  const startGame = useCallback(
    (mCfg: MouseGameConfig) => {
      setMouseConfig(mCfg);

      // Build a compatible NBackConfig for ResultScreen
      const nCfg: NBackConfig = {
        ...DEFAULT_CONFIG,
        mode: 'mouse',
        totalRounds: mCfg.totalRounds,
        nLevel: mCfg.numPushes,
        gridSize: mCfg.cols,
      };
      setNbackConfig(nCfg);

      // Pre-generate all puzzles
      const allPuzzles: MousePuzzle[] = [];
      for (let i = 0; i < mCfg.totalRounds; i++) {
        allPuzzles.push(generatePuzzle(mCfg));
      }
      setPuzzles(allPuzzles);

      setCurrentRound(0);
      setCurrentPushIndex(0);
      setRoundResults([]);
      setSummary(null);
      startTimeRef.current = Date.now();
      setPhase('revealing');
    },
    [],
  );

  const onRevealComplete = useCallback(() => {
    if (phase === 'revealing') setPhase('covering');
  }, [phase]);

  const onCoverComplete = useCallback(() => {
    if (phase === 'covering') {
      setCurrentPushIndex(0);
      if (currentPuzzle && currentPuzzle.pushOps.length > 0) {
        setPhase('pushing');
      } else {
        setPhase('answering');
      }
    }
  }, [phase, currentPuzzle]);

  const onPushAnimComplete = useCallback(() => {
    if (phase !== 'pushing' || !currentPuzzle) return;
    const nextPush = currentPushIndex + 1;
    if (nextPush >= currentPuzzle.pushOps.length) {
      setPhase('answering');
    } else {
      setCurrentPushIndex(nextPush);
    }
  }, [phase, currentPushIndex, currentPuzzle]);

  const submitAnswer = useCallback(
    (selectedCells: number[]) => {
      if (phase !== 'answering' || !currentPuzzle) return;

      const { mousePositions, totalMice } = currentPuzzle;
      const mouseSet = new Set(mousePositions);

      let correctCount = 0;
      let wrongSelections = 0;

      for (const cell of selectedCells) {
        if (mouseSet.has(cell)) {
          correctCount++;
        } else {
          wrongSelections++;
        }
      }

      const result: MouseRoundResult = {
        selectedCells,
        mousePositions,
        correctCount,
        totalMice,
        wrongSelections,
      };

      setRoundResults((prev) => [...prev, result]);
      setPhase('feedback');
    },
    [phase, currentPuzzle],
  );

  const onFeedbackComplete = useCallback(() => {
    if (phase !== 'feedback') return;
    const nextRound = currentRound + 1;

    if (nextRound >= totalRounds) {
      setRoundResults((prev) => {
        const s = buildMouseSummary(prev, nbackConfig);
        setSummary(s);
        return prev;
      });
      setPhase('finished');
    } else {
      setCurrentRound(nextRound);
      setCurrentPushIndex(0);
      setPhase('revealing');
    }
  }, [phase, currentRound, totalRounds, nbackConfig, buildMouseSummary]);

  const resetGame = useCallback(() => {
    setPhase('idle');
    setPuzzles([]);
    setCurrentRound(0);
    setCurrentPushIndex(0);
    setRoundResults([]);
    setSummary(null);
  }, []);

  return {
    phase,
    puzzle: currentPuzzle,
    currentRound,
    totalRounds,
    mouseConfig,
    currentPushIndex,
    roundResults,
    summary,
    config: nbackConfig,
    startGame,
    onRevealComplete,
    onCoverComplete,
    onPushAnimComplete,
    submitAnswer,
    onFeedbackComplete,
    resetGame,
  };
}
