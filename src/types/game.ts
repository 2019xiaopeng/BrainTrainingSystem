// ============================================================
// Brain Flow - Core Game Type Definitions
// ============================================================

/** Possible states for the game lifecycle */
export type GamePhase = 'idle' | 'playing' | 'waitingToAnswer' | 'answering' | 'paused' | 'finished';

/** Game mode types */
export type GameMode = 'numeric' | 'spatial' | 'mouse';

/** The type of stimulus shown to the player (deprecated, kept for compatibility) */
export type StimulusType = 'number' | 'position' | 'word';

/** View/screen the player is currently on */
export type AppView = 'home' | 'game' | 'result';

// ------------------------------------------------------------
// User Profile & History
// ------------------------------------------------------------

/** User's persistent profile data */
export interface UserProfile {
  /** Accumulative points across all sessions */
  totalScore: number;
  /** Highest N-Back level passed with >80% accuracy */
  maxNLevel: number;
  /** Current consecutive days streak */
  daysStreak: number;
  /** Last played date (ISO string for comparison) */
  lastPlayedDate: string | null;
}

/** Simplified session entry for history list */
export interface SessionHistoryEntry {
  /** When this session was played (timestamp) */
  timestamp: number;
  /** N-Back level for this session */
  nLevel: number;
  /** Accuracy percentage (0-100) */
  accuracy: number;
  /** Points earned in this session */
  score: number;
  /** Total rounds played */
  totalRounds: number;
}

/** User's saved game configuration for each mode */
export interface GameConfigs {
  numeric: {
    nLevel: number;
    rounds: number;
  };
  spatial: {
    nLevel: number;
    rounds: number;
    gridSize: number;
  };
  mouse: {
    count: number;
    grid: MouseGridPreset;
    difficulty: MouseDifficultyLevel;
    rounds: number;
  };
}

// ------------------------------------------------------------
// Configuration
// ------------------------------------------------------------

/** Configuration for a single N-Back session */
export interface NBackConfig {
  /** The "N" in N-Back (how many rounds back to recall) */
  nLevel: number;
  /** Total number of stimuli to present in the session */
  totalRounds: number;
  /** Milliseconds each stimulus is shown before timeout */
  stimulusDuration: number;
  /** Milliseconds of blank gap between stimuli */
  interStimulusInterval: number;
  /** Type of stimulus for this session (deprecated) */
  stimulusType: StimulusType;
  /** Game mode (numeric, spatial, or mouse) */
  mode: GameMode;
  /** Grid size for spatial mode (3 = 3x3, 4 = 4x4, 5 = 5x5) */
  gridSize: number;
}

/** Sensible defaults for a 2-back numeric session */
export const DEFAULT_CONFIG: NBackConfig = {
  nLevel: 2,
  totalRounds: 20,
  stimulusDuration: 2500,
  interStimulusInterval: 500,
  stimulusType: 'number',
  mode: 'numeric',
  gridSize: 3,
};

// ------------------------------------------------------------
// Stimulus
// ------------------------------------------------------------

/** Base stimulus properties */
interface BaseStimulus {
  /** Unique index in the sequence (0-based) */
  index: number;
  /** Timestamp when this stimulus was presented */
  presentedAt: number;
}

/** Numeric stimulus (math equation) */
export interface NumericStimulus extends BaseStimulus {
  type: 'numeric';
  /** The equation string displayed (e.g., "3 + 5") */
  equation: string;
  /** The correct answer to the equation */
  answer: number;
}

/** Spatial stimulus (grid position) */
export interface SpatialStimulus extends BaseStimulus {
  type: 'spatial';
  /** Grid index (0-8 for 3x3 grid) */
  gridIndex: number;
}

/** Discriminated union of N-Back stimulus types */
export type Stimulus = NumericStimulus | SpatialStimulus;

// ------------------------------------------------------------
// Round Result
// ------------------------------------------------------------

/** Outcome of a single round (one stimulus presentation) */
export interface RoundResult {
  /** Index of the stimulus being answered (currentIndex - N) */
  targetStimulusIndex: number;
  /** The equation being answered (for numeric mode) */
  targetEquation?: string;
  /** Grid index being answered (for spatial mode) */
  targetGridIndex?: number;
  /** What the correct answer was (number for numeric, grid index for spatial) */
  correctAnswer: number;
  /** What the user answered (null = no response / timed out) */
  userAnswer: number | null;
  /** Whether the user was correct */
  isCorrect: boolean;
  /** Reaction time in ms (null if no response) */
  reactionTimeMs: number | null;
}

// ------------------------------------------------------------
// Session Summary
// ------------------------------------------------------------

/** Aggregated results after a complete game session */
export interface SessionSummary {
  /** The config used for this session */
  config: NBackConfig;
  /** All individual round results */
  rounds: RoundResult[];
  /** Counts */
  totalRounds: number;
  correctCount: number;
  incorrectCount: number;
  missedCount: number;
  /** Performance breakdown */
  hits: number;        // correct answers (deprecated for delayed recall, kept for compatibility)
  misses: number;      // no answer provided (timed out)
  falseAlarms: number; // incorrect answers (deprecated, kept for compatibility)
  correctRejects: number; // (deprecated, kept for compatibility)
  /** Accuracy as percentage (0-100) */
  accuracy: number;
  /** Average reaction time for correct responses (ms) */
  avgReactionTimeMs: number;
  /** Session duration (ms) */
  durationMs: number;
  /** When this session was completed (timestamp) */
  timestamp?: number;
  /** Points earned in this session (calculated based on accuracy and n-level) */
  score?: number;
}

// ============================================================
// Mouse Game (Devilish Mice / 魔鬼老鼠) - Separate Type System
// ============================================================

/** Cell content on the mouse game grid (grid is FULLY filled: every cell is mouse or cat) */
export type CellContent = 'mouse' | 'cat';

/** A push operation: a new cat enters from one side, shifting a row/column */
export interface PushOperation {
  /** Which side the new cat enters from */
  side: 'left' | 'right' | 'top' | 'bottom';
  /** Row index (for left/right) or column index (for top/bottom) */
  lineIndex: number;
}

/** A single cell on the grid with a stable identity for animation */
export interface GridCell {
  /** Unique stable ID for React key (survives position changes) */
  id: string;
  /** What this cell contains */
  content: CellContent;
}

/** A complete puzzle (one round of mouse game) */
export interface MousePuzzle {
  /** Grid dimensions */
  cols: number;
  rows: number;
  /** Initial flat grid (row-major, length = cols × rows), fully filled */
  initialCells: GridCell[];
  /** Sequence of push operations */
  pushOps: PushOperation[];
  /** Final grid state after all pushes */
  finalCells: GridCell[];
  /** Flat indices of mice in the final grid (surviving mice only) */
  mousePositions: number[];
  /** Number of surviving mice to find */
  totalMice: number;
  /** Number of mice that were pushed off the grid */
  lostMice: number;
  /** Original number of mice placed */
  initialMiceCount: number;
}

/** Result of a single mouse puzzle round */
export interface MouseRoundResult {
  /** Which cells the player selected */
  selectedCells: number[];
  /** Where the mice actually were */
  mousePositions: number[];
  /** How many mice were correctly identified */
  correctCount: number;
  /** Total surviving mice in this puzzle */
  totalMice: number;
  /** How many wrong cells were selected */
  wrongSelections: number;
}

/** Difficulty level for the mouse game */
export type MouseDifficultyLevel = 'easy' | 'medium' | 'hard' | 'hell';

/** Grid size preset: [cols, rows] */
export type MouseGridPreset = [cols: number, rows: number];

/** Available grid presets */
export const MOUSE_GRID_PRESETS: { label: string; value: MouseGridPreset }[] = [
  { label: '4×3', value: [4, 3] },
  { label: '5×4', value: [5, 4] },
  { label: '6×5', value: [6, 5] },
];

/** Map difficulty level to push count */
export const MOUSE_DIFFICULTY_MAP: Record<MouseDifficultyLevel, { label: string; pushes: number }> = {
  easy:   { label: '简单', pushes: 4 },
  medium: { label: '中等', pushes: 7 },
  hard:   { label: '困难', pushes: 10 },
  hell:   { label: '地狱', pushes: 13 },
};

/** Complete configuration for a mouse game session */
export interface MouseGameConfig {
  /** Number of mice to place (3-7) */
  numMice: number;
  /** Grid columns */
  cols: number;
  /** Grid rows */
  rows: number;
  /** Number of push operations */
  numPushes: number;
  /** Number of rounds per session */
  totalRounds: number;
  /** Reveal/memorize duration in ms */
  revealDuration: number;
}

/** Build a MouseGameConfig from user selections */
export function buildMouseGameConfig(
  numMice: number,
  gridPreset: MouseGridPreset,
  difficulty: MouseDifficultyLevel,
  totalRounds: number,
): MouseGameConfig {
  return {
    numMice: Math.max(1, Math.min(numMice, gridPreset[0] * gridPreset[1] - 1)),
    cols: gridPreset[0],
    rows: gridPreset[1],
    numPushes: MOUSE_DIFFICULTY_MAP[difficulty].pushes,
    totalRounds,
    revealDuration: 3000,
  };
}
