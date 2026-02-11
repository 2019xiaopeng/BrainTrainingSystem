// ============================================================
// Brain Flow - Core Game Type Definitions
// ============================================================

/** Possible states for the game lifecycle */
export type GamePhase = 'idle' | 'playing' | 'waitingToAnswer' | 'answering' | 'paused' | 'finished';

/** Game mode types */
export type GameMode = 'numeric' | 'spatial' | 'mouse' | 'house';

/** The type of stimulus shown to the player (deprecated, kept for compatibility) */
export type StimulusType = 'number' | 'position' | 'word';

/** View/screen the player is currently on */
export type AppView = 'home' | 'game' | 'result';

// ------------------------------------------------------------
// User Profile & History
// ------------------------------------------------------------

/** Six-dimension brain stats for radar chart */
export interface BrainStats {
  /** Memory — derived from max N levels across modes */
  memory: number;
  /** Focus — recent average accuracy */
  focus: number;
  /** Math/Calculation — numeric mode performance */
  math: number;
  /** Observation — spatial + mouse mode performance */
  observation: number;
  /** Load Capacity (负载力) — house + numeric N-Back combined */
  loadCapacity: number;
  /** Reaction (反应力) — average reaction time inverted (higher = faster) */
  reaction: number;
}

/** Brain Rank level definition */
export interface BrainRankLevel {
  level: number;
  titleZh: string;
  titleEn: string;
  xpRequired: number;
  /** 
   * Milestone requirements (e.g., unlock 2-Back Numeric). 
   * Each inner array is an OR group (any one of them satisfied is enough).
   * Wait, PRD says "A > 90% OR B > 90%". 
   * Let's simplify: `milestones` is a list of milestone IDs.
   * If `milestoneLogic` is 'OR', then meeting ANY one is sufficient.
   * If `milestoneLogic` is 'AND' (default), then ALL must be met.
   */
  milestones?: string[];
  milestoneLogic?: 'AND' | 'OR';
}

/** All brain rank levels */
export const BRAIN_RANK_LEVELS: BrainRankLevel[] = [
  { level: 1, titleZh: '见习', titleEn: 'Novice', xpRequired: 0 },
  { 
    level: 2, 
    titleZh: '觉醒', 
    titleEn: 'Awakened', 
    xpRequired: 500,
    milestones: ['numeric_2back', 'spatial_3x3_2back'],
    milestoneLogic: 'OR'
  },
  { 
    level: 3, 
    titleZh: '敏捷', 
    titleEn: 'Agile', 
    xpRequired: 2000,
    milestones: ['spatial_4x4_2back', 'mouse_4mice'],
    milestoneLogic: 'OR'
  },
  { 
    level: 4, 
    titleZh: '逻辑', 
    titleEn: 'Logical', 
    xpRequired: 5000,
    milestones: ['numeric_3back', 'house_normal_12'],
    milestoneLogic: 'OR'
  },
  { 
    level: 5, 
    titleZh: '深邃', 
    titleEn: 'Profound', 
    xpRequired: 10000,
    milestones: ['spatial_5x5_3back', 'mouse_7mice'],
    milestoneLogic: 'OR'
  },
  { 
    level: 6, 
    titleZh: '大师', 
    titleEn: 'Master', 
    xpRequired: 30000,
    milestones: ['numeric_5back', 'house_fast_15'],
    milestoneLogic: 'OR'
  },
  { 
    level: 7, 
    titleZh: '超凡', 
    titleEn: 'Transcendent', 
    xpRequired: 80000,
    milestones: ['numeric_7back', 'spatial_5x5', 'mouse_9mice', 'house_fast_15'],
    milestoneLogic: 'AND' // All required for Transcendent
  },
];

/** Get current brain rank from XP and milestones */
export function getBrainRank(xp: number, completedMilestones: string[] = []): BrainRankLevel {
  for (let i = BRAIN_RANK_LEVELS.length - 1; i >= 0; i--) {
    const rank = BRAIN_RANK_LEVELS[i];
    if (xp >= rank.xpRequired) {
      // Check if milestones are met (if any)
      if (rank.milestones && rank.milestones.length > 0) {
        if (rank.milestoneLogic === 'OR') {
          const anyMet = rank.milestones.some(m => completedMilestones.includes(m));
          if (anyMet) return rank;
        } else {
          // Default AND
          const allMet = rank.milestones.every(m => completedMilestones.includes(m));
          if (allMet) return rank;
        }
      } else {
        // No milestones required
        return rank;
      }
    }
  }
  return BRAIN_RANK_LEVELS[0];
}

/** Get next brain rank (null if max) */
export function getNextBrainRank(xp: number, completedMilestones: string[] = []): BrainRankLevel | null {
  const current = getBrainRank(xp, completedMilestones);
  const nextIdx = BRAIN_RANK_LEVELS.findIndex(r => r.level === current.level) + 1;
  return nextIdx < BRAIN_RANK_LEVELS.length ? BRAIN_RANK_LEVELS[nextIdx] : null;
}

/** Authentication provider type */
export type AuthProvider = 'guest' | 'email' | 'google' | 'wechat';

/** User's authentication profile (placeholder for future backend) */
export interface AuthProfile {
  /** Current login status */
  status: 'guest' | 'authenticated';
  /** Better Auth user id (present when authenticated) */
  userId?: string;
  /** User email (optional) */
  email?: string;
  /** Display name */
  displayName: string;
  /** Avatar URL (null for default) */
  avatarUrl: string | null;
  /** Linked providers */
  linkedProviders: AuthProvider[];
}

/** User's persistent profile data */
export interface UserProfile {
  /** Accumulative points across all sessions */
  totalScore: number;
  /** Total experience points (for rank system) */
  totalXP: number;
  /** Highest N-Back level passed with >80% accuracy */
  maxNLevel: number;
  /** Current consecutive days streak */
  daysStreak: number;
  /** Last played date (ISO string for comparison) */
  lastPlayedDate: string | null;
  /** Six-dimension brain stats */
  brainStats: BrainStats;
  /** Auth profile (placeholder) */
  auth: AuthProfile;
  /** Completed milestones (e.g., ['numeric_2back', 'spatial_3x3']) */
  completedMilestones: string[];
  /** In-game currency (Brain Coins) */
  brainCoins: number;
  /** Energy system state */
  energy: EnergyState;
  /** Check-in system state */
  checkIn: CheckInState;
  /** Owned permanent items (product IDs) */
  ownedItems: string[];
}

export type GameUnlocks = {
  numeric: { maxN: number; roundsByN: Record<string, number[]> };
  spatial: { grids: number[]; maxNByGrid: Record<string, number>; roundsByN: Record<string, number[]> };
  mouse: { maxMice: number; grids: [number, number][]; difficulties: MouseDifficultyLevel[]; maxRounds: number };
  house: { speeds: HouseSpeed[]; maxInitialPeople: number; maxEvents: number; maxRounds: number };
};

// ------------------------------------------------------------
// Energy System
// ------------------------------------------------------------

/** Energy system state */
export interface EnergyState {
  /** Current energy points */
  current: number;
  /** Maximum energy capacity */
  max: number;
  /** Timestamp of last energy update (for recovery calculation) */
  lastUpdated: number;
  /** Timestamp until which energy is unlimited (0 = no unlimited) */
  unlimitedUntil: number;
}

/** Recovery interval in ms (4 hours) */
export const ENERGY_RECOVERY_INTERVAL_MS = 4 * 60 * 60 * 1000;

/** Default max energy */
export const ENERGY_MAX = 5;

/** Calculate recovered energy based on time elapsed */
export function calculateRecoveredEnergy(state: EnergyState): EnergyState {
  if (state.current >= state.max) return state;
  const now = Date.now();
  const elapsed = now - state.lastUpdated;
  const recovered = Math.floor(elapsed / ENERGY_RECOVERY_INTERVAL_MS);
  if (recovered <= 0) return state;
  const newCurrent = Math.min(state.max, state.current + recovered);
  const remainder = elapsed % ENERGY_RECOVERY_INTERVAL_MS;
  return {
    ...state,
    current: newCurrent,
    lastUpdated: now - remainder,
  };
}

/** Get remaining time until next energy recovery in ms */
export function getNextRecoveryMs(state: EnergyState): number {
  if (state.current >= state.max) return 0;
  const now = Date.now();
  const elapsed = now - state.lastUpdated;
  const remaining = ENERGY_RECOVERY_INTERVAL_MS - (elapsed % ENERGY_RECOVERY_INTERVAL_MS);
  return remaining;
}

// ------------------------------------------------------------
// Check-in System
// ------------------------------------------------------------

/** Check-in system state */
export interface CheckInState {
  /** Last check-in date (ISO date string YYYY-MM-DD) */
  lastCheckInDate: string | null;
  /** Consecutive check-in days */
  consecutiveDays: number;
}

/** Check-in reward tiers */
export function getCheckInReward(consecutiveDays: number): { xp: number; coins: number } {
  if (consecutiveDays >= 7) return { xp: 50, coins: 60 };
  if (consecutiveDays >= 3) return { xp: 50, coins: 20 };
  return { xp: 50, coins: 10 };
}

// ------------------------------------------------------------
// Store Products
// ------------------------------------------------------------

/** Product effect types */
export type ProductEffect =
  | { type: 'energy'; amount: number }
  | { type: 'streak_saver' }
  | { type: 'premium_report' };

/** Store product definition */
export interface StoreProduct {
  id: string;
  type: 'consumable' | 'permanent';
  nameKey: string;
  descKey: string;
  price: number;
  icon: string;
  effect: ProductEffect;
}

/** All available products */
export const STORE_PRODUCTS: StoreProduct[] = [
  {
    id: 'energy_1',
    type: 'consumable',
    nameKey: 'store.energyPotion1',
    descKey: 'store.energyPotion1Desc',
    price: 100,
    icon: '⚡',
    effect: { type: 'energy', amount: 1 },
  },
  {
    id: 'energy_5',
    type: 'consumable',
    nameKey: 'store.energyPotion5',
    descKey: 'store.energyPotion5Desc',
    price: 450,
    icon: '🔋',
    effect: { type: 'energy', amount: 5 },
  },
  {
    id: 'streak_saver',
    type: 'consumable',
    nameKey: 'store.streakSaver',
    descKey: 'store.streakSaverDesc',
    price: 500,
    icon: '🛡️',
    effect: { type: 'streak_saver' },
  },
  {
    id: 'premium_report',
    type: 'permanent',
    nameKey: 'store.premiumReport',
    descKey: 'store.premiumReportDesc',
    price: 1000,
    icon: '📊',
    effect: { type: 'premium_report' },
  },
];

export interface DailyActivityEntry {
  date: string;
  totalXp: number;
  sessionsCount: number;
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
  /** Game mode */
  mode: GameMode;
  /** Average reaction time in ms */
  avgReactionTimeMs?: number;
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
  house: {
    initialPeople: number;
    eventCount: number;
    speed: HouseSpeed;
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

// ============================================================
// House Game (人来人往 / House Flow) - Type System
// ============================================================

/** Speed preset for house game */
export type HouseSpeed = 'easy' | 'normal' | 'fast';

/** A single atomic event tick: enter and/or leave */
export interface HouseEvent {
  /** Event index (0-based) */
  index: number;
  /** Number of people entering (0, 1, 2, 3) */
  enterCount: number;
  /** Number of people leaving (0, 1, 2, 3) */
  leaveCount: number;
  /** Delay in ms before this event triggers (relative to previous event) */
  delayMs: number;
}

/** Configuration for a single house game session */
export interface HouseGameConfig {
  /** Number of people inside the house at the start */
  initialPeople: number;
  /** Total number of atomic events per round */
  eventCount: number;
  /** Base delay range for events [min, max] in ms */
  delayRange: [number, number];
  /** Number of rounds per session */
  totalRounds: number;
}

/** Result of one house game round */
export interface HouseRoundResult {
  /** Correct final count */
  correctCount: number;
  /** User's answer */
  userAnswer: number | null;
  /** Whether the user was correct */
  isCorrect: boolean;
  /** The sequence of events that occurred */
  events: HouseEvent[];
  /** Initial people count */
  initialPeople: number;
}

/** Speed preset → delay range [min, max] ms */
export const HOUSE_SPEED_MAP: Record<HouseSpeed, { label: string; delayRange: [number, number] }> = {
  easy:   { label: '慢速', delayRange: [960, 1600] },
  normal: { label: '正常', delayRange: [640, 1200] },
  fast:   { label: '快速', delayRange: [320, 720] },
};

/** Build a HouseGameConfig from user selections */
export function buildHouseGameConfig(
  initialPeople: number,
  eventCount: number,
  speed: HouseSpeed,
  totalRounds: number,
): HouseGameConfig {
  const clampToStep = (value: number, min: number, max: number, step: number) => {
    const clamped = Math.max(min, Math.min(value, max));
    return min + Math.floor((clamped - min) / step) * step;
  };

  return {
    initialPeople: Math.max(3, Math.min(initialPeople, 7)),
    eventCount: clampToStep(eventCount, 6, 24, 3),
    delayRange: HOUSE_SPEED_MAP[speed].delayRange,
    totalRounds: Math.max(3, Math.min(totalRounds, 5)),
  };
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
