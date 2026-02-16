import { and, eq } from "drizzle-orm";
import { db } from "../_lib/db/index.js";
import { campaignEpisodes, campaignLevels, userCampaignLevelResults, userCampaignState } from "../_lib/db/schema/index.js";
import { requireSessionUser } from "../_lib/session.js";
import type { RequestLike, ResponseLike } from "../_lib/http.js";
import { isRecord } from "../_lib/http.js";

const clampInt = (n: unknown, fallback = 0) => (Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : fallback);

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

export default async function handler(req: RequestLike, res: ResponseLike) {
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
    const body = req.body && typeof req.body === "object" ? req.body : typeof req.body === "string" ? (() => {
      try { return JSON.parse(req.body); } catch { return null; }
    })() : null;

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
}
