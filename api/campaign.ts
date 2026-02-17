import { and, asc, eq } from "drizzle-orm";
import { db } from "../server/_lib/db/index.js";
import { campaignEpisodes, campaignLevels, userCampaignLevelResults, userCampaignState } from "../server/_lib/db/schema/index.js";
import { requireSessionUser } from "../server/_lib/session.js";
import type { RequestLike, ResponseLike } from "../server/_lib/http.js";
import { isRecord } from "../server/_lib/http.js";

const getUrl = (req: RequestLike): string => {
  const raw = (req as unknown as { url?: unknown }).url;
  return typeof raw === "string" ? raw : "http://localhost/api/campaign";
};

const clampInt = (n: unknown, fallback = 0) => (Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : fallback);

const fallback = () => ({
  episodes: [
    { id: 1,  title: "觉醒", description: "基础回路上线",   storyText: "系统重启中…欢迎回来。让我们从最基础的记忆与追踪开始。", order: 1 },
    { id: 2,  title: "扩张", description: "双重记忆通道",   storyText: "新的输入通道接入。双重回忆开始了，保持稳定。", order: 2 },
    { id: 3,  title: "分化", description: "多维追踪",       storyText: "你将面对多种协议的切换压力。策略比蛮力更重要。", order: 3 },
    { id: 4,  title: "并行", description: "三重负载",       storyText: "负载升高到三重。心流初现，在速度与准确之间找到平衡。", order: 4 },
    { id: 5,  title: "深潜", description: "深度追踪",       storyText: "更大的网格，更深的记忆。你的空间感知正在觉醒。", order: 5 },
    { id: 6,  title: "蜕变", description: "四重回忆",       storyText: "四重回忆的门槛。越过它，你将进入全新的认知层次。", order: 6 },
    { id: 7,  title: "统御", description: "全局掌控",       storyText: "多维度同时运转，你需要统御全局。这是大师之路的起点。", order: 7 },
    { id: 8,  title: "共振", description: "五重共振",       storyText: "五重回忆——人类工作记忆的极限边界。进入共振态。", order: 8 },
    { id: 9,  title: "超越", description: "超越极限",       storyText: "已知的边界不再能定义你。持续突破，向更高处攀登。", order: 9 },
    { id: 10, title: "飞升", description: "毕业试炼",       storyText: "最终的门槛。完成它，你将拥有持续专注的超凡能力。", order: 10 },
  ],
  levels: [
    // Episode 1: 觉醒 (N=1)
    { id: 1,  episodeId: 1, orderInEpisode: 1, title: "数字心流 · 入门",      gameMode: "numeric", config: { nLevel: 1, rounds: 10 },                                               passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 50, y: 85 } },
    { id: 2,  episodeId: 1, orderInEpisode: 2, title: "空间心流 · 入门",      gameMode: "spatial", config: { gridSize: 3, nLevel: 1, rounds: 10 },                                  passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 30, y: 70 } },
    { id: 3,  episodeId: 1, orderInEpisode: 3, title: "魔鬼老鼠 · 入门",      gameMode: "mouse",   config: { count: 3, grid: [4, 3], difficulty: "easy", rounds: 3 },                 passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 70, y: 55 } },
    { id: 4,  episodeId: 1, orderInEpisode: 4, title: "人来人往 · 入门",      gameMode: "house",   config: { speed: "easy", initialPeople: 3, eventCount: 6, rounds: 3 },            passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 40, y: 35 } },
    { id: 5,  episodeId: 1, orderInEpisode: 5, title: "核心校准 · 入门",      gameMode: "numeric", config: { nLevel: 1, rounds: 10 },                                               passRule: { minAccuracy: 90 }, boss: true,  mapPosition: { x: 50, y: 15 } },
    // Episode 2: 扩张 (numeric N=2)
    { id: 6,  episodeId: 2, orderInEpisode: 1, title: "双重回忆 · 数字",      gameMode: "numeric", config: { nLevel: 2, rounds: 10 },                                               passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 50, y: 85 } },
    { id: 7,  episodeId: 2, orderInEpisode: 2, title: "稳定推进 · 空间",      gameMode: "spatial", config: { gridSize: 3, nLevel: 1, rounds: 15 },                                  passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 30, y: 70 } },
    { id: 8,  episodeId: 2, orderInEpisode: 3, title: "追踪推进 · 老鼠",      gameMode: "mouse",   config: { count: 4, grid: [4, 3], difficulty: "easy", rounds: 3 },                 passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 70, y: 55 } },
    { id: 9,  episodeId: 2, orderInEpisode: 4, title: "节律推进 · 人来人往",   gameMode: "house",   config: { speed: "easy", initialPeople: 4, eventCount: 8, rounds: 3 },            passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 40, y: 35 } },
    { id: 10, episodeId: 2, orderInEpisode: 5, title: "核心校准 · N2",        gameMode: "numeric", config: { nLevel: 2, rounds: 10 },                                               passRule: { minAccuracy: 90 }, boss: true,  mapPosition: { x: 50, y: 15 } },
    // Episode 3: 分化 (spatial N=2, mouse medium)
    { id: 11, episodeId: 3, orderInEpisode: 1, title: "双重追踪 · 空间",      gameMode: "spatial", config: { gridSize: 3, nLevel: 2, rounds: 10 },                                  passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 50, y: 85 } },
    { id: 12, episodeId: 3, orderInEpisode: 2, title: "耐力延展 · 数字",      gameMode: "numeric", config: { nLevel: 2, rounds: 15 },                                               passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 30, y: 70 } },
    { id: 13, episodeId: 3, orderInEpisode: 3, title: "分支解锁 · 老鼠",      gameMode: "mouse",   config: { count: 4, grid: [4, 3], difficulty: "medium", rounds: 3 },               passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 70, y: 55 } },
    { id: 14, episodeId: 3, orderInEpisode: 4, title: "分支解锁 · 人来人往",   gameMode: "house",   config: { speed: "normal", initialPeople: 4, eventCount: 9, rounds: 3 },          passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 40, y: 35 } },
    { id: 15, episodeId: 3, orderInEpisode: 5, title: "核心突破 · 空间",      gameMode: "spatial", config: { gridSize: 3, nLevel: 2, rounds: 10 },                                  passRule: { minAccuracy: 90 }, boss: true,  mapPosition: { x: 50, y: 15 } },
    // Episode 4: 并行 (numeric N=3)
    { id: 16, episodeId: 4, orderInEpisode: 1, title: "三重回忆 · 数字",      gameMode: "numeric", config: { nLevel: 3, rounds: 10 },                                               passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 50, y: 85 } },
    { id: 17, episodeId: 4, orderInEpisode: 2, title: "稳定推进 · 空间 II",   gameMode: "spatial", config: { gridSize: 3, nLevel: 2, rounds: 15 },                                  passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 30, y: 70 } },
    { id: 18, episodeId: 4, orderInEpisode: 3, title: "追踪升级 · 老鼠",      gameMode: "mouse",   config: { count: 5, grid: [4, 3], difficulty: "medium", rounds: 4 },               passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 70, y: 55 } },
    { id: 19, episodeId: 4, orderInEpisode: 4, title: "负载推进 · 人来人往",   gameMode: "house",   config: { speed: "normal", initialPeople: 5, eventCount: 10, rounds: 3 },         passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 40, y: 35 } },
    { id: 20, episodeId: 4, orderInEpisode: 5, title: "核心校准 · N3",        gameMode: "numeric", config: { nLevel: 3, rounds: 10 },                                               passRule: { minAccuracy: 90 }, boss: true,  mapPosition: { x: 50, y: 15 } },
    // Episode 5: 深潜 (spatial N=3, 4×4)
    { id: 21, episodeId: 5, orderInEpisode: 1, title: "三重追踪 · 空间",      gameMode: "spatial", config: { gridSize: 3, nLevel: 3, rounds: 10 },                                  passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 50, y: 85 } },
    { id: 22, episodeId: 5, orderInEpisode: 2, title: "耐力延展 · 数字 II",   gameMode: "numeric", config: { nLevel: 3, rounds: 15 },                                               passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 30, y: 70 } },
    { id: 23, episodeId: 5, orderInEpisode: 3, title: "网格解锁 · 4×4",       gameMode: "spatial", config: { gridSize: 4, nLevel: 1, rounds: 10 },                                  passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 70, y: 55 } },
    { id: 24, episodeId: 5, orderInEpisode: 4, title: "挑战升级 · 老鼠",      gameMode: "mouse",   config: { count: 5, grid: [5, 4], difficulty: "medium", rounds: 4 },               passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 40, y: 35 } },
    { id: 25, episodeId: 5, orderInEpisode: 5, title: "核心突破 · 4×4",       gameMode: "spatial", config: { gridSize: 4, nLevel: 2, rounds: 10 },                                  passRule: { minAccuracy: 90 }, boss: true,  mapPosition: { x: 50, y: 15 } },
    // Episode 6: 蜕变 (numeric N=4)
    { id: 26, episodeId: 6, orderInEpisode: 1, title: "四重回忆 · 数字",      gameMode: "numeric", config: { nLevel: 4, rounds: 10 },                                               passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 50, y: 85 } },
    { id: 27, episodeId: 6, orderInEpisode: 2, title: "深度追踪 · 空间",      gameMode: "spatial", config: { gridSize: 4, nLevel: 2, rounds: 15 },                                  passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 30, y: 70 } },
    { id: 28, episodeId: 6, orderInEpisode: 3, title: "高压推进 · 老鼠",      gameMode: "mouse",   config: { count: 5, grid: [5, 4], difficulty: "hard", rounds: 4 },                 passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 70, y: 55 } },
    { id: 29, episodeId: 6, orderInEpisode: 4, title: "快速反应 · 人来人往",   gameMode: "house",   config: { speed: "fast", initialPeople: 5, eventCount: 12, rounds: 4 },           passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 40, y: 35 } },
    { id: 30, episodeId: 6, orderInEpisode: 5, title: "核心校准 · N4",        gameMode: "numeric", config: { nLevel: 4, rounds: 10 },                                               passRule: { minAccuracy: 90 }, boss: true,  mapPosition: { x: 50, y: 15 } },
    // Episode 7: 统御 (spatial 4×4 N=3, 5×5)
    { id: 31, episodeId: 7, orderInEpisode: 1, title: "三重追踪 · 4×4",       gameMode: "spatial", config: { gridSize: 4, nLevel: 3, rounds: 10 },                                  passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 50, y: 85 } },
    { id: 32, episodeId: 7, orderInEpisode: 2, title: "耐力延展 · 数字 III",  gameMode: "numeric", config: { nLevel: 4, rounds: 15 },                                               passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 30, y: 70 } },
    { id: 33, episodeId: 7, orderInEpisode: 3, title: "极限网格 · 5×5",       gameMode: "spatial", config: { gridSize: 5, nLevel: 1, rounds: 10 },                                  passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 70, y: 55 } },
    { id: 34, episodeId: 7, orderInEpisode: 4, title: "极限推进 · 老鼠",      gameMode: "mouse",   config: { count: 6, grid: [5, 4], difficulty: "hard", rounds: 5 },                 passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 40, y: 35 } },
    { id: 35, episodeId: 7, orderInEpisode: 5, title: "核心突破 · 5×5",       gameMode: "spatial", config: { gridSize: 5, nLevel: 2, rounds: 10 },                                  passRule: { minAccuracy: 90 }, boss: true,  mapPosition: { x: 50, y: 15 } },
    // Episode 8: 共振 (numeric N=5)
    { id: 36, episodeId: 8, orderInEpisode: 1, title: "五重回忆 · 数字",      gameMode: "numeric", config: { nLevel: 5, rounds: 10 },                                               passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 50, y: 85 } },
    { id: 37, episodeId: 8, orderInEpisode: 2, title: "深度追踪 · 5×5",       gameMode: "spatial", config: { gridSize: 5, nLevel: 2, rounds: 15 },                                  passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 30, y: 70 } },
    { id: 38, episodeId: 8, orderInEpisode: 3, title: "地狱老鼠 · 入门",      gameMode: "mouse",   config: { count: 6, grid: [6, 5], difficulty: "hard", rounds: 5 },                 passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 70, y: 55 } },
    { id: 39, episodeId: 8, orderInEpisode: 4, title: "极限人潮 · 人来人往",   gameMode: "house",   config: { speed: "fast", initialPeople: 6, eventCount: 15, rounds: 4 },           passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 40, y: 35 } },
    { id: 40, episodeId: 8, orderInEpisode: 5, title: "核心校准 · N5",        gameMode: "numeric", config: { nLevel: 5, rounds: 10 },                                               passRule: { minAccuracy: 90 }, boss: true,  mapPosition: { x: 50, y: 15 } },
    // Episode 9: 超越
    { id: 41, episodeId: 9, orderInEpisode: 1, title: "五重追踪 · 空间",      gameMode: "spatial", config: { gridSize: 5, nLevel: 3, rounds: 10 },                                  passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 50, y: 85 } },
    { id: 42, episodeId: 9, orderInEpisode: 2, title: "耐力巅峰 · 数字",      gameMode: "numeric", config: { nLevel: 5, rounds: 15 },                                               passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 30, y: 70 } },
    { id: 43, episodeId: 9, orderInEpisode: 3, title: "地狱试炼 · 老鼠",      gameMode: "mouse",   config: { count: 7, grid: [6, 5], difficulty: "hell", rounds: 5 },                 passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 70, y: 55 } },
    { id: 44, episodeId: 9, orderInEpisode: 4, title: "终极人潮 · 人来人往",   gameMode: "house",   config: { speed: "fast", initialPeople: 7, eventCount: 18, rounds: 5 },           passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 40, y: 35 } },
    { id: 45, episodeId: 9, orderInEpisode: 5, title: "终极突破 · 数字",      gameMode: "numeric", config: { nLevel: 5, rounds: 20 },                                               passRule: { minAccuracy: 90 }, boss: true,  mapPosition: { x: 50, y: 15 } },
    // Episode 10: 飞升
    { id: 46, episodeId: 10, orderInEpisode: 1, title: "毕业试炼 · 数字",     gameMode: "numeric", config: { nLevel: 5, rounds: 20 },                                               passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 50, y: 85 } },
    { id: 47, episodeId: 10, orderInEpisode: 2, title: "毕业试炼 · 空间",     gameMode: "spatial", config: { gridSize: 5, nLevel: 3, rounds: 15 },                                  passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 30, y: 70 } },
    { id: 48, episodeId: 10, orderInEpisode: 3, title: "毕业试炼 · 老鼠",     gameMode: "mouse",   config: { count: 7, grid: [6, 5], difficulty: "hell", rounds: 5 },                 passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 70, y: 55 } },
    { id: 49, episodeId: 10, orderInEpisode: 4, title: "毕业试炼 · 人来人往",  gameMode: "house",   config: { speed: "fast", initialPeople: 7, eventCount: 18, rounds: 5 },           passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 40, y: 35 } },
    { id: 50, episodeId: 10, orderInEpisode: 5, title: "最终校准",            gameMode: "numeric", config: { nLevel: 5, rounds: 25 },                                               passRule: { minAccuracy: 90 }, boss: true,  mapPosition: { x: 50, y: 15 } },
  ],
});

const ensureInitialized = async (userId: string) => {
  const existing = await db
    .select({
      userId: userCampaignState.userId,
      currentEpisodeId: userCampaignState.currentEpisodeId,
      currentLevelId: userCampaignState.currentLevelId,
      viewedEpisodeStoryIds: userCampaignState.viewedEpisodeStoryIds,
    })
    .from(userCampaignState)
    .where(eq(userCampaignState.userId, userId))
    .limit(1);

  if (existing[0]) return existing[0];

  const firstEpisode = await db
    .select({ id: campaignEpisodes.id })
    .from(campaignEpisodes)
    .where(eq(campaignEpisodes.isActive, true))
    .orderBy(campaignEpisodes.order)
    .limit(1);

  const episodeId = firstEpisode[0]?.id ?? 1;

  const firstLevel = await db
    .select({ id: campaignLevels.id })
    .from(campaignLevels)
    .where(and(eq(campaignLevels.isActive, true), eq(campaignLevels.episodeId, episodeId)))
    .orderBy(campaignLevels.orderInEpisode)
    .limit(1);

  const levelId = firstLevel[0]?.id ?? 1;

  const now = new Date();
  await db.insert(userCampaignState).values({
    userId,
    currentEpisodeId: episodeId,
    currentLevelId: levelId,
    viewedEpisodeStoryIds: [],
    updatedAt: now,
  });

  return { userId, currentEpisodeId: episodeId, currentLevelId: levelId, viewedEpisodeStoryIds: [] as number[] | null };
};

const handleMeta = async (_req: RequestLike, res: ResponseLike) => {
  try {
    const episodes = await db
      .select({
        id: campaignEpisodes.id,
        title: campaignEpisodes.title,
        description: campaignEpisodes.description,
        storyText: campaignEpisodes.storyText,
        order: campaignEpisodes.order,
      })
      .from(campaignEpisodes)
      .where(eq(campaignEpisodes.isActive, true))
      .orderBy(asc(campaignEpisodes.order));

    const levels = await db
      .select({
        id: campaignLevels.id,
        episodeId: campaignLevels.episodeId,
        orderInEpisode: campaignLevels.orderInEpisode,
        title: campaignLevels.title,
        gameMode: campaignLevels.gameMode,
        config: campaignLevels.config,
        passRule: campaignLevels.passRule,
        boss: campaignLevels.boss,
        mapPosition: campaignLevels.mapPosition,
      })
      .from(campaignLevels)
      .where(eq(campaignLevels.isActive, true))
      .orderBy(asc(campaignLevels.id));

    res.status(200).json({ episodes, levels });
  } catch {
    res.status(200).json(fallback());
  }
};

const handleProgress = async (req: RequestLike, res: ResponseLike) => {
  let sessionUser;
  try {
    sessionUser = await requireSessionUser(req);
  } catch {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  if (req.method === "GET") {
    const state = await ensureInitialized(sessionUser.id);
    const results = await db
      .select({
        levelId: userCampaignLevelResults.levelId,
        bestStars: userCampaignLevelResults.bestStars,
        bestAccuracy: userCampaignLevelResults.bestAccuracy,
        bestScore: userCampaignLevelResults.bestScore,
        clearedAt: userCampaignLevelResults.clearedAt,
      })
      .from(userCampaignLevelResults)
      .where(eq(userCampaignLevelResults.userId, sessionUser.id));

    res.status(200).json({
      state: {
        currentEpisodeId: state.currentEpisodeId,
        currentLevelId: state.currentLevelId,
        viewedEpisodeStoryIds: state.viewedEpisodeStoryIds ?? [],
      },
      results,
    });
    return;
  }

  if (req.method === "POST") {
    const body =
      req.body && typeof req.body === "object"
        ? req.body
        : typeof req.body === "string"
          ? (() => {
              try {
                return JSON.parse(req.body);
              } catch {
                return null;
              }
            })()
          : null;

    if (!isRecord(body)) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    const viewedEpisodeId = body.viewedEpisodeId !== undefined ? clampInt(body.viewedEpisodeId, 0) : 0;
    const setCurrentLevelId = body.currentLevelId !== undefined ? clampInt(body.currentLevelId, 0) : 0;

    const state = await ensureInitialized(sessionUser.id);
    const nextViewed = new Set<number>((state.viewedEpisodeStoryIds ?? []) as number[]);
    if (viewedEpisodeId > 0) nextViewed.add(viewedEpisodeId);

    let nextEpisodeId = state.currentEpisodeId;
    let nextLevelId = state.currentLevelId;

    if (setCurrentLevelId > 0) {
      const level = await db
        .select({ id: campaignLevels.id, episodeId: campaignLevels.episodeId })
        .from(campaignLevels)
        .where(and(eq(campaignLevels.id, setCurrentLevelId), eq(campaignLevels.isActive, true)))
        .limit(1);
      if (level[0]) {
        nextLevelId = level[0].id;
        nextEpisodeId = level[0].episodeId;
      }
    }

    const now = new Date();
    await db
      .update(userCampaignState)
      .set({
        currentEpisodeId: nextEpisodeId,
        currentLevelId: nextLevelId,
        viewedEpisodeStoryIds: Array.from(nextViewed),
        updatedAt: now,
      })
      .where(eq(userCampaignState.userId, sessionUser.id));

    res.status(200).json({
      ok: true,
      state: {
        currentEpisodeId: nextEpisodeId,
        currentLevelId: nextLevelId,
        viewedEpisodeStoryIds: Array.from(nextViewed),
      },
    });
    return;
  }

  res.status(405).json({ error: "method_not_allowed" });
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const url = new URL(getUrl(req), "http://localhost");
  const op = (url.searchParams.get("op") ?? "").trim();
  const pathname = url.pathname || "";
  const action = op || (pathname.endsWith("/meta") ? "meta" : pathname.endsWith("/progress") ? "progress" : "");

  if (action === "meta") {
    if (req.method !== "GET") {
      res.status(405).json({ error: "method_not_allowed" });
      return;
    }
    await handleMeta(req, res);
    return;
  }

  if (action === "progress") {
    await handleProgress(req, res);
    return;
  }

  res.status(404).json({ error: "not_found" });
}

