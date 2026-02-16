import type { CampaignProgress, CampaignProgressState, CampaignLevelResult } from "../../types/campaign";

const STORAGE_KEY = "brain-flow-campaign:guest:v1";

const clampInt = (n: unknown, fallback = 0) => (Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : fallback);

const normalizeState = (raw: unknown): CampaignProgressState => {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const viewedRaw = r.viewedEpisodeStoryIds;
  return {
    currentEpisodeId: Math.max(1, clampInt(r.currentEpisodeId, 1)),
    currentLevelId: Math.max(1, clampInt(r.currentLevelId, 1)),
    viewedEpisodeStoryIds: Array.isArray(viewedRaw) ? viewedRaw.map((x) => clampInt(x, 0)).filter((x) => x > 0) : [],
  };
};

const normalizeResults = (raw: unknown): CampaignLevelResult[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : null))
    .filter((x): x is Record<string, unknown> => Boolean(x))
    .map((x) => ({
      levelId: Math.max(1, clampInt(x.levelId, 1)),
      bestStars: Math.max(0, Math.min(3, clampInt(x.bestStars, 0))),
      bestAccuracy: Math.max(0, Math.min(100, clampInt(x.bestAccuracy, 0))),
      bestScore: x.bestScore == null ? null : clampInt(x.bestScore, 0),
      clearedAt: x.clearedAt == null ? null : clampInt(x.clearedAt, 0),
    }));
};

export const readGuestCampaignProgress = (): CampaignProgress => {
  if (typeof window === "undefined") {
    return { state: { currentEpisodeId: 1, currentLevelId: 1, viewedEpisodeStoryIds: [] }, results: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: { currentEpisodeId: 1, currentLevelId: 1, viewedEpisodeStoryIds: [] }, results: [] };
    const parsed = JSON.parse(raw) as { state?: unknown; results?: unknown };
    return { state: normalizeState(parsed?.state), results: normalizeResults(parsed?.results) };
  } catch {
    return { state: { currentEpisodeId: 1, currentLevelId: 1, viewedEpisodeStoryIds: [] }, results: [] };
  }
};

export const writeGuestCampaignProgress = (progress: CampaignProgress) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    return;
  }
};

export const computeStars = (accuracy: number) => (accuracy >= 90 ? 3 : accuracy >= 80 ? 2 : accuracy >= 60 ? 1 : 0);

export const updateGuestCampaignAfterSession = (params: {
  levelId: number;
  accuracy: number;
  score: number;
  minAccuracy: number;
  episodeId: number;
  orderInEpisode: number;
  getNextLevelId: (episodeId: number, orderInEpisode: number) => { nextEpisodeId: number; nextLevelId: number } | null;
}) => {
  const prev = readGuestCampaignProgress();
  const stars = computeStars(params.accuracy);
  const passed = params.accuracy >= params.minAccuracy;

  const resultsById = new Map(prev.results.map((r) => [r.levelId, r]));
  const existing = resultsById.get(params.levelId);
  const nextResult: CampaignLevelResult = {
    levelId: params.levelId,
    bestStars: Math.max(existing?.bestStars ?? 0, stars),
    bestAccuracy: Math.max(existing?.bestAccuracy ?? 0, Math.round(params.accuracy)),
    bestScore: existing?.bestScore == null ? params.score : Math.max(existing.bestScore ?? 0, params.score),
    clearedAt: passed ? (existing?.clearedAt ?? Date.now()) : (existing?.clearedAt ?? null),
  };
  resultsById.set(params.levelId, nextResult);

  let nextState = prev.state;
  if (passed && prev.state.currentLevelId === params.levelId) {
    const next = params.getNextLevelId(params.episodeId, params.orderInEpisode);
    if (next) {
      nextState = { ...prev.state, currentEpisodeId: next.nextEpisodeId, currentLevelId: next.nextLevelId };
    }
  }

  const nextProgress: CampaignProgress = { state: nextState, results: Array.from(resultsById.values()) };
  writeGuestCampaignProgress(nextProgress);
  return { progress: nextProgress, stars, passed };
};

