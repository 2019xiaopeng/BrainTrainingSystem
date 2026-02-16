export enum GameMode {
  N_BACK = 'N_BACK',
}

export enum GameType {
  NUMERIC = 'NUMERIC', // 1+1 Calculation N-Back
  SPATIAL = 'SPATIAL', // Grid Position N-Back
  MOUSE = 'MOUSE',     // Tracking Hidden Objects
  HOUSE = 'HOUSE',     // Dynamic Counting
}

export enum NodeStatus {
  LOCKED = 'LOCKED',
  UNLOCKED = 'UNLOCKED',
  COMPLETED = 'COMPLETED',
}

export interface LevelConfig {
  id: number;
  episodeId: number;
  gameType: GameType;
  title: string;
  n: number; // N-back level or Difficulty
  trials: number;
  interval: number; // ms between stimuli
  minScore: number; // % accuracy to pass
  position: { x: number; y: number }; // Map position percentages
  isBoss?: boolean;
  rewardImagePrompt?: string; 
  tutorial?: boolean; // Is this a tutorial level?
}

export interface Episode {
  id: number;
  title: string;
  description: string;
  storyText: string; // Narrative text shown when unlocking
}

export interface UserProgress {
  currentLevelId: number;
  currentEpisodeId: number;
  stars: Record<number, number>; // levelId -> stars (0-3)
  energy: number;
  maxEnergy: number;
  gems: number;
  unlockedImages: Record<number, string>;
  viewedStories: number[]; // IDs of stories read
}

export interface GameResult {
  accuracy: number;
  stars: number;
  passed: boolean;
  score?: number;
  total?: number;
}

export type ViewState = 'MAP' | 'GAME' | 'RESULT' | 'COACH' | 'SHOP' | 'GENERATOR';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
