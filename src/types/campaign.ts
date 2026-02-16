import type { GameMode, MouseDifficultyLevel, MouseGridPreset, HouseSpeed } from "./game";

export type CampaignLevelConfig =
  | { mode: "numeric"; nLevel: number; rounds: number }
  | { mode: "spatial"; gridSize: number; nLevel: number; rounds: number }
  | { mode: "mouse"; count: number; grid: MouseGridPreset; difficulty: MouseDifficultyLevel; rounds: number }
  | { mode: "house"; speed: HouseSpeed; initialPeople: number; eventCount: number; rounds: number };

export type CampaignPassRule = { minAccuracy?: number };

export type CampaignEpisode = {
  id: number;
  title: string;
  description: string;
  storyText: string;
  order: number;
};

export type CampaignLevel = {
  id: number;
  episodeId: number;
  orderInEpisode: number;
  title: string;
  gameMode: GameMode;
  config: Record<string, unknown>;
  passRule: CampaignPassRule;
  boss: boolean;
  mapPosition: { x: number; y: number };
};

export type CampaignProgressState = {
  currentEpisodeId: number;
  currentLevelId: number;
  viewedEpisodeStoryIds: number[];
};

export type CampaignLevelResult = {
  levelId: number;
  bestStars: number;
  bestAccuracy: number;
  bestScore?: number | null;
  clearedAt?: number | null;
};

export type CampaignProgress = {
  state: CampaignProgressState;
  results: CampaignLevelResult[];
};

