import { LevelConfig, Episode, GameType } from './types';

export const MAX_ENERGY = 20;
export const ENERGY_COST_PER_LEVEL = 5;

export const EPISODES: Episode[] = [
  {
    id: 1,
    title: "觉醒",
    description: "重新激活基础认知功能。",
    storyText: "系统重启中... \n\n欢迎回来，指挥官。神经网络已经休眠了400个周期。多个认知扇区处于离线状态。\n\n我们需要手动重新激活突触中继。让我们从基础的空间记忆和逻辑回路开始。"
  },
  {
    id: 2,
    title: "扩张",
    description: "稳定动态物体追踪系统。",
    storyText: "核心系统已上线。\n\n然而，追踪雷达极不稳定。我们在系统中检测到“幽灵数据”——移动轨迹不可预测的幻影信号。\n\n你需要校准运动传感器（追踪协议）和输入计数器（人流协议）。"
  },
  {
    id: 3,
    title: "飞升",
    description: "实现高负载并行处理。",
    storyText: "系统负载即将达到临界值。\n\n为了实现最终的“飞升”，你必须同时处理多模态输入。N-Back 协议现在将混合空间信号与听觉信号。\n\n保持专注。奇点临近。"
  }
];

export const LEVELS: LevelConfig[] = [
  // --- EPISODE 1: Awakening (Spatial & Numeric) ---
  {
    id: 1,
    episodeId: 1,
    gameType: GameType.SPATIAL,
    title: "突触连接 I",
    n: 1,
    trials: 5,
    interval: 2000,
    minScore: 0, // Tutorial pass
    position: { x: 50, y: 85 },
    tutorial: true, // Spatial Tutorial
    rewardImagePrompt: "A single glowing green synapse connecting in a white void, minimal"
  },
  {
    id: 2,
    episodeId: 1,
    gameType: GameType.SPATIAL,
    title: "突触连接 II",
    n: 1,
    trials: 15,
    interval: 2000,
    minScore: 70,
    position: { x: 30, y: 70 },
    rewardImagePrompt: "A neural grid lighting up, clean clinical style"
  },
  {
    id: 3,
    episodeId: 1,
    gameType: GameType.NUMERIC,
    title: "逻辑门 I",
    n: 1,
    trials: 5,
    interval: 0, // User paced
    minScore: 0,
    position: { x: 70, y: 55 },
    tutorial: true, // Numeric Tutorial
    rewardImagePrompt: "Floating geometric numbers in a data stream, blue and white"
  },
  {
    id: 4,
    episodeId: 1,
    gameType: GameType.NUMERIC,
    title: "逻辑门 II",
    n: 1,
    trials: 15,
    interval: 0,
    minScore: 80,
    position: { x: 50, y: 40 },
    rewardImagePrompt: "Mathematical equations forming a bridge, abstract art"
  },
  {
    id: 5,
    episodeId: 1,
    gameType: GameType.SPATIAL,
    title: "皮层核心",
    n: 2,
    trials: 20,
    interval: 2500,
    minScore: 70,
    position: { x: 50, y: 15 },
    isBoss: true,
    rewardImagePrompt: "A glowing brain core pulsing with energy, cinematic lighting, 8k"
  },

  // --- EPISODE 2: Expansion (Mouse & House) ---
  {
    id: 6,
    episodeId: 2,
    gameType: GameType.MOUSE,
    title: "幽灵信号",
    n: 3, // 3 Mice
    trials: 3,
    interval: 1000,
    minScore: 0,
    position: { x: 20, y: 80 },
    tutorial: true, // Mouse Tutorial
    rewardImagePrompt: "Digital ghost trails moving in a maze, neon green"
  },
  {
    id: 7,
    episodeId: 2,
    gameType: GameType.MOUSE,
    title: "追踪阵列",
    n: 4, // 4 Mice
    trials: 5,
    interval: 800,
    minScore: 80,
    position: { x: 40, y: 60 },
    rewardImagePrompt: "Radar screen tracking multiple targets, sci-fi UI"
  },
  {
    id: 8,
    episodeId: 2,
    gameType: GameType.HOUSE,
    title: "数据洪流",
    n: 1, // Difficulty
    trials: 3,
    interval: 1000,
    minScore: 0,
    position: { x: 80, y: 50 },
    tutorial: true, // House Tutorial
    rewardImagePrompt: "Abstract data flow entering and leaving a server, isometric"
  },
  {
    id: 9,
    episodeId: 2,
    gameType: GameType.HOUSE,
    title: "流量控制",
    n: 2,
    trials: 5,
    interval: 1200,
    minScore: 80,
    position: { x: 60, y: 30 },
    isBoss: true,
    rewardImagePrompt: "City traffic time lapse, long exposure lights, futuristic city"
  }
];

export const INITIAL_PROGRESS = {
  currentLevelId: 1,
  currentEpisodeId: 1,
  stars: {},
  energy: MAX_ENERGY,
  maxEnergy: MAX_ENERGY,
  gems: 100,
  unlockedImages: {},
  viewedStories: []
};