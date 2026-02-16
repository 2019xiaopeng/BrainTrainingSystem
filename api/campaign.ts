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
    { id: 1, title: "觉醒", description: "基础回路上线", storyText: "系统重启中…欢迎回来。让我们从最基础的记忆与追踪开始。", order: 1 },
    { id: 2, title: "扩张", description: "耐力与稳定性", storyText: "新的输入通道接入。保持稳定，别让噪声扰乱节律。", order: 2 },
    { id: 3, title: "分化", description: "多分支策略", storyText: "你将面对多种协议的切换压力。策略比蛮力更重要。", order: 3 },
    { id: 4, title: "并行", description: "负载提升", storyText: "负载升高，心流出现。你需要在速度与准确之间找到平衡。", order: 4 },
    { id: 5, title: "飞升", description: "毕业前夜", storyText: "最后的门槛。完成它，你将拥有持续专注的能力。", order: 5 },
  ],
  levels: [
    { id: 1, episodeId: 1, orderInEpisode: 1, title: "数字心流 · 入门", gameMode: "numeric", config: { nLevel: 1, rounds: 5 }, passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 50, y: 85 } },
    { id: 2, episodeId: 1, orderInEpisode: 2, title: "空间心流 · 入门", gameMode: "spatial", config: { gridSize: 3, nLevel: 1, rounds: 5 }, passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 30, y: 70 } },
    { id: 3, episodeId: 1, orderInEpisode: 3, title: "魔鬼老鼠 · 入门", gameMode: "mouse", config: { count: 3, grid: [4, 3], difficulty: "easy", rounds: 3 }, passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 70, y: 55 } },
    { id: 4, episodeId: 1, orderInEpisode: 4, title: "人来人往 · 入门", gameMode: "house", config: { speed: "easy", initialPeople: 3, eventCount: 6, rounds: 3 }, passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 40, y: 35 } },
    { id: 5, episodeId: 1, orderInEpisode: 5, title: "核心校准 · 数字", gameMode: "numeric", config: { nLevel: 1, rounds: 10 }, passRule: { minAccuracy: 90 }, boss: true, mapPosition: { x: 50, y: 15 } },

    { id: 6, episodeId: 2, orderInEpisode: 1, title: "强度推进 · 数字", gameMode: "numeric", config: { nLevel: 2, rounds: 10 }, passRule: { minAccuracy: 90 }, boss: false, mapPosition: { x: 50, y: 85 } },
    { id: 7, episodeId: 2, orderInEpisode: 2, title: "稳定推进 · 空间", gameMode: "spatial", config: { gridSize: 3, nLevel: 1, rounds: 10 }, passRule: { minAccuracy: 90 }, boss: false, mapPosition: { x: 30, y: 70 } },
    { id: 8, episodeId: 2, orderInEpisode: 3, title: "追踪推进 · 老鼠", gameMode: "mouse", config: { count: 3, grid: [4, 3], difficulty: "easy", rounds: 3 }, passRule: { minAccuracy: 90 }, boss: false, mapPosition: { x: 70, y: 55 } },
    { id: 9, episodeId: 2, orderInEpisode: 4, title: "节律推进 · 人来人往", gameMode: "house", config: { speed: "easy", initialPeople: 3, eventCount: 6, rounds: 3 }, passRule: { minAccuracy: 90 }, boss: false, mapPosition: { x: 40, y: 35 } },
    { id: 10, episodeId: 2, orderInEpisode: 5, title: "核心校准 · 空间", gameMode: "spatial", config: { gridSize: 3, nLevel: 2, rounds: 10 }, passRule: { minAccuracy: 90 }, boss: true, mapPosition: { x: 50, y: 15 } },

    { id: 11, episodeId: 3, orderInEpisode: 1, title: "耐力延展 · 数字", gameMode: "numeric", config: { nLevel: 2, rounds: 15 }, passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 50, y: 85 } },
    { id: 12, episodeId: 3, orderInEpisode: 2, title: "耐力延展 · 空间", gameMode: "spatial", config: { gridSize: 3, nLevel: 2, rounds: 15 }, passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 30, y: 70 } },
    { id: 13, episodeId: 3, orderInEpisode: 3, title: "分支解锁 · 老鼠", gameMode: "mouse", config: { count: 4, grid: [4, 3], difficulty: "medium", rounds: 4 }, passRule: { minAccuracy: 90 }, boss: false, mapPosition: { x: 70, y: 55 } },
    { id: 14, episodeId: 3, orderInEpisode: 4, title: "分支解锁 · 人来人往", gameMode: "house", config: { speed: "normal", initialPeople: 4, eventCount: 9, rounds: 4 }, passRule: { minAccuracy: 90 }, boss: false, mapPosition: { x: 40, y: 35 } },
    { id: 15, episodeId: 3, orderInEpisode: 5, title: "核心突破 · 数字", gameMode: "numeric", config: { nLevel: 3, rounds: 10 }, passRule: { minAccuracy: 90 }, boss: true, mapPosition: { x: 50, y: 15 } },

    { id: 16, episodeId: 4, orderInEpisode: 1, title: "网格解锁 · 空间", gameMode: "spatial", config: { gridSize: 3, nLevel: 3, rounds: 10 }, passRule: { minAccuracy: 90 }, boss: false, mapPosition: { x: 50, y: 85 } },
    { id: 17, episodeId: 4, orderInEpisode: 2, title: "并行推进 · 老鼠", gameMode: "mouse", config: { count: 5, grid: [5, 4], difficulty: "medium", rounds: 4 }, passRule: { minAccuracy: 90 }, boss: false, mapPosition: { x: 30, y: 70 } },
    { id: 18, episodeId: 4, orderInEpisode: 3, title: "负载推进 · 人来人往", gameMode: "house", config: { speed: "normal", initialPeople: 5, eventCount: 12, rounds: 4 }, passRule: { minAccuracy: 90 }, boss: false, mapPosition: { x: 70, y: 55 } },
    { id: 19, episodeId: 4, orderInEpisode: 4, title: "耐力延展 · 数字 II", gameMode: "numeric", config: { nLevel: 3, rounds: 15 }, passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 40, y: 35 } },
    { id: 20, episodeId: 4, orderInEpisode: 5, title: "核心校准 · 4×4", gameMode: "spatial", config: { gridSize: 4, nLevel: 1, rounds: 10 }, passRule: { minAccuracy: 90 }, boss: true, mapPosition: { x: 50, y: 15 } },

    { id: 21, episodeId: 5, orderInEpisode: 1, title: "毕业预热 · 老鼠", gameMode: "mouse", config: { count: 6, grid: [5, 4], difficulty: "hard", rounds: 5 }, passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 50, y: 85 } },
    { id: 22, episodeId: 5, orderInEpisode: 2, title: "毕业预热 · 人来人往", gameMode: "house", config: { speed: "fast", initialPeople: 6, eventCount: 15, rounds: 5 }, passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 30, y: 70 } },
    { id: 23, episodeId: 5, orderInEpisode: 3, title: "强度拉满 · 数字", gameMode: "numeric", config: { nLevel: 4, rounds: 10 }, passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 70, y: 55 } },
    { id: 24, episodeId: 5, orderInEpisode: 4, title: "稳定拉满 · 空间", gameMode: "spatial", config: { gridSize: 4, nLevel: 2, rounds: 10 }, passRule: { minAccuracy: 60 }, boss: false, mapPosition: { x: 40, y: 35 } },
    { id: 25, episodeId: 5, orderInEpisode: 5, title: "毕业试炼 · 人来人往", gameMode: "house", config: { speed: "fast", initialPeople: 7, eventCount: 18, rounds: 5 }, passRule: { minAccuracy: 90 }, boss: true, mapPosition: { x: 50, y: 15 } },
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

