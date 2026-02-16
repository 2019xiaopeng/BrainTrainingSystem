import { useEffect, useMemo, useState } from "react";
import { CampaignMapNode } from "./CampaignMapNode";
import type { CampaignEpisode, CampaignLevel, CampaignProgress, CampaignProgressState } from "../../types/campaign";
import type { GameMode, GameUnlocks, HouseGameConfig, HouseSpeed, MouseDifficultyLevel, MouseGameConfig, MouseGridPreset, UserProfile } from "../../types/game";
import { buildHouseGameConfig, buildMouseGameConfig } from "../../types/game";
import { isLevelConfigUnlocked } from "../../lib/campaign/unlocking";
import { readGuestCampaignProgress, writeGuestCampaignProgress } from "../../lib/campaign/guestProgress";

type NodeStatus = "locked" | "unlocked" | "completed";

const clampInt = (n: unknown, fallback = 0) => (Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : fallback);

const defaultProgress: CampaignProgress = { state: { currentEpisodeId: 1, currentLevelId: 1, viewedEpisodeStoryIds: [] }, results: [] };

const normalizeMeta = (raw: unknown): { episodes: CampaignEpisode[]; levels: CampaignLevel[] } | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.episodes) || !Array.isArray(r.levels)) return null;
  const episodes = r.episodes
    .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : null))
    .filter((x): x is Record<string, unknown> => Boolean(x))
    .map((x) => ({
      id: clampInt(x.id, 0),
      title: String(x.title ?? ""),
      description: String(x.description ?? ""),
      storyText: String(x.storyText ?? ""),
      order: clampInt(x.order, 0),
    }))
    .filter((e) => e.id > 0)
    .sort((a, b) => a.order - b.order);

  const levels = r.levels
    .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : null))
    .filter((x): x is Record<string, unknown> => Boolean(x))
    .map((x) => {
      const mapPos = x.mapPosition && typeof x.mapPosition === "object" ? (x.mapPosition as Record<string, unknown>) : {};
      return {
        id: clampInt(x.id, 0),
        episodeId: clampInt(x.episodeId, 0),
        orderInEpisode: clampInt(x.orderInEpisode, 0),
        title: String(x.title ?? ""),
        gameMode: String(x.gameMode ?? "numeric") as GameMode,
        config: (x.config && typeof x.config === "object" ? (x.config as Record<string, unknown>) : {}) as Record<string, unknown>,
        passRule: (x.passRule && typeof x.passRule === "object" ? (x.passRule as Record<string, unknown>) : {}) as Record<string, unknown>,
        boss: Boolean(x.boss),
        mapPosition: { x: clampInt(mapPos.x, 50), y: clampInt(mapPos.y, 50) },
      } satisfies CampaignLevel;
    })
    .filter((l) => l.id > 0 && l.episodeId > 0 && l.orderInEpisode > 0)
    .sort((a, b) => a.id - b.id);

  if (episodes.length === 0 || levels.length === 0) return null;
  return { episodes, levels };
};

const normalizeProgress = (raw: unknown): CampaignProgress | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const stateRaw = r.state && typeof r.state === "object" ? (r.state as Record<string, unknown>) : null;
  const resultsRaw = r.results;
  if (!stateRaw || !Array.isArray(resultsRaw)) return null;
  const viewed = stateRaw.viewedEpisodeStoryIds;
  const state: CampaignProgressState = {
    currentEpisodeId: Math.max(1, clampInt(stateRaw.currentEpisodeId, 1)),
    currentLevelId: Math.max(1, clampInt(stateRaw.currentLevelId, 1)),
    viewedEpisodeStoryIds: Array.isArray(viewed) ? viewed.map((x) => clampInt(x, 0)).filter((x) => x > 0) : [],
  };
  const results = resultsRaw
    .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : null))
    .filter((x): x is Record<string, unknown> => Boolean(x))
    .map((x) => ({
      levelId: Math.max(1, clampInt(x.levelId, 1)),
      bestStars: Math.max(0, Math.min(3, clampInt(x.bestStars, 0))),
      bestAccuracy: Math.max(0, Math.min(100, clampInt(x.bestAccuracy, 0))),
      bestScore: x.bestScore == null ? null : clampInt(x.bestScore, 0),
      clearedAt: x.clearedAt ? new Date(String(x.clearedAt)).getTime() : null,
    }));
  return { state, results };
};

const minAccuracyForLevel = (level: CampaignLevel) => {
  const raw = level.passRule && typeof level.passRule === "object" ? (level.passRule as Record<string, unknown>) : {};
  return Math.max(0, Math.min(100, clampInt(raw.minAccuracy, level.boss ? 90 : 60)));
};

const formatModeLabel = (mode: GameMode) => {
  if (mode === "numeric") return "数字心流";
  if (mode === "spatial") return "空间心流";
  if (mode === "mouse") return "魔鬼老鼠";
  return "人来人往";
};

const formatLevelParams = (level: CampaignLevel) => {
  const cfg = level.config as Record<string, unknown>;
  if (level.gameMode === "numeric") return `N=${clampInt(cfg.nLevel, 1)} · Rounds=${clampInt(cfg.rounds, 10)}`;
  if (level.gameMode === "spatial")
    return `${clampInt(cfg.gridSize, 3)}×${clampInt(cfg.gridSize, 3)} · N=${clampInt(cfg.nLevel, 1)} · Rounds=${clampInt(cfg.rounds, 10)}`;
  if (level.gameMode === "mouse")
    return `${clampInt(cfg.count, 3)}鼠 · ${String((cfg.grid as unknown[] | undefined)?.[0] ?? 4)}×${String((cfg.grid as unknown[] | undefined)?.[1] ?? 3)} · ${String(cfg.difficulty ?? "easy")} · ${clampInt(cfg.rounds, 3)}轮`;
  return `${String(cfg.speed ?? "easy")} · 初始${clampInt(cfg.initialPeople, 3)} · 事件${clampInt(cfg.eventCount, 6)} · ${clampInt(cfg.rounds, 3)}轮`;
};

const buildStartArgs = (level: CampaignLevel): { mode: GameMode; nLevel: number; rounds: number; gridSize: number; mouseConfig?: MouseGameConfig; houseConfig?: HouseGameConfig } => {
  const cfg = level.config as Record<string, unknown>;
  if (level.gameMode === "numeric") {
    return { mode: "numeric", nLevel: clampInt(cfg.nLevel, 1), rounds: clampInt(cfg.rounds, 10), gridSize: 0 };
  }
  if (level.gameMode === "spatial") {
    return {
      mode: "spatial",
      nLevel: clampInt(cfg.nLevel, 1),
      rounds: clampInt(cfg.rounds, 10),
      gridSize: clampInt(cfg.gridSize, 3),
    };
  }
  if (level.gameMode === "mouse") {
    const gridRaw = cfg.grid;
    const grid = Array.isArray(gridRaw) ? ([clampInt(gridRaw[0], 4), clampInt(gridRaw[1], 3)] as [number, number]) : ([4, 3] as [number, number]);
    const mouseConfig = buildMouseGameConfig(
      clampInt(cfg.count, 3),
      grid as MouseGridPreset,
      String(cfg.difficulty ?? "easy") as MouseDifficultyLevel,
      clampInt(cfg.rounds, 3)
    );
    return { mode: "mouse", nLevel: 1, rounds: mouseConfig.totalRounds, gridSize: mouseConfig.cols, mouseConfig };
  }
  const houseConfig = buildHouseGameConfig(
    clampInt(cfg.initialPeople, 3),
    clampInt(cfg.eventCount, 6),
    String(cfg.speed ?? "easy") as HouseSpeed,
    clampInt(cfg.rounds, 3)
  );
  return { mode: "house", nLevel: 1, rounds: houseConfig.totalRounds, gridSize: 0, houseConfig };
};

export function CampaignMapView(props: {
  userProfile: UserProfile;
  unlocks: GameUnlocks | null;
  onStart: (nLevel: number, rounds: number, mode: GameMode, gridSize: number, mouseConfig?: MouseGameConfig, houseConfig?: HouseGameConfig) => void;
  onSetActiveCampaignRun: (run: null | { levelId: number; episodeId: number; orderInEpisode: number; minAccuracy: number; nextEpisodeId: number; nextLevelId: number }) => void;
  lastCampaignUpdate?: unknown;
}) {
  const isGuest = (props.userProfile.auth?.status ?? "guest") === "guest";

  const [meta, setMeta] = useState<{ episodes: CampaignEpisode[]; levels: CampaignLevel[] } | null>(null);
  const [progress, setProgress] = useState<CampaignProgress>(defaultProgress);
  const [activeEpisodeId, setActiveEpisodeId] = useState<number>(1);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [showStory, setShowStory] = useState(false);

  const episodes = meta?.episodes ?? [];
  const allLevels = meta?.levels ?? [];

  const episodeLevels = useMemo(() => {
    return allLevels.filter((l) => l.episodeId === activeEpisodeId).sort((a, b) => a.orderInEpisode - b.orderInEpisode);
  }, [allLevels, activeEpisodeId]);

  const levelsById = useMemo(() => new Map(allLevels.map((l) => [l.id, l])), [allLevels]);
  const resultsById = useMemo(() => new Map(progress.results.map((r) => [r.levelId, r])), [progress.results]);

  const getNextLevelId = useMemo(() => {
    return (episodeId: number, orderInEpisode: number) => {
      const next = allLevels.find((l) => l.episodeId === episodeId && l.orderInEpisode === orderInEpisode + 1);
      if (next) return { nextEpisodeId: episodeId, nextLevelId: next.id };
      const currentEp = episodes.find((e) => e.id === episodeId);
      if (!currentEp) return null;
      const nextEp = episodes.find((e) => e.order === currentEp.order + 1);
      if (!nextEp) return null;
      const first = allLevels
        .filter((l) => l.episodeId === nextEp.id)
        .sort((a, b) => a.orderInEpisode - b.orderInEpisode)[0];
      if (!first) return null;
      return { nextEpisodeId: nextEp.id, nextLevelId: first.id };
    };
  }, [allLevels, episodes]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const metaResp = await fetch("/api/campaign/meta").catch(() => null);
      const metaJson = metaResp && metaResp.ok ? await metaResp.json().catch(() => null) : null;
      const parsedMeta = normalizeMeta(metaJson);
      if (!cancelled) setMeta(parsedMeta);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshProgress = async () => {
    if (isGuest) {
      const p = readGuestCampaignProgress();
      setProgress(p);
      setActiveEpisodeId(p.state.currentEpisodeId);
      return;
    }
    const resp = await fetch("/api/campaign/progress", { credentials: "include" }).catch(() => null);
    const json = resp && resp.ok ? await resp.json().catch(() => null) : null;
    const parsed = normalizeProgress(json);
    if (parsed) {
      setProgress(parsed);
      setActiveEpisodeId(parsed.state.currentEpisodeId);
    }
  };

  useEffect(() => {
    void refreshProgress();
  }, [isGuest]);

  useEffect(() => {
    if (!props.lastCampaignUpdate) return;
    void refreshProgress();
  }, [props.lastCampaignUpdate]);

  useEffect(() => {
    if (!episodes.length) return;
    const viewed = new Set(progress.state.viewedEpisodeStoryIds ?? []);
    if (!viewed.has(activeEpisodeId)) {
      setShowStory(true);
    } else {
      setShowStory(false);
    }
  }, [episodes.length, activeEpisodeId, progress.state.viewedEpisodeStoryIds]);

  const markEpisodeViewed = async (episodeId: number) => {
    if (isGuest) {
      const next = readGuestCampaignProgress();
      const set = new Set(next.state.viewedEpisodeStoryIds);
      set.add(episodeId);
      const updated = { ...next, state: { ...next.state, viewedEpisodeStoryIds: Array.from(set) } };
      writeGuestCampaignProgress(updated);
      setProgress(updated);
      return;
    }
    await fetch("/api/campaign/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ viewedEpisodeId: episodeId }),
    }).catch(() => null);
    await refreshProgress();
  };

  const mapPath = useMemo(() => {
    if (episodeLevels.length < 2) return "";
    const sorted = [...episodeLevels].sort((a, b) => a.orderInEpisode - b.orderInEpisode);
    let d = `M ${sorted[0].mapPosition.x} ${sorted[0].mapPosition.y}`;
    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i];
      const next = sorted[i + 1];
      const cp1x = curr.mapPosition.x;
      const cp1y = (curr.mapPosition.y + next.mapPosition.y) / 2;
      const cp2x = next.mapPosition.x;
      const cp2y = (curr.mapPosition.y + next.mapPosition.y) / 2;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.mapPosition.x} ${next.mapPosition.y}`;
    }
    return d;
  }, [episodeLevels]);

  const getNodeStatus = (level: CampaignLevel): { status: NodeStatus; stars: number; lockedHint?: string } => {
    const result = resultsById.get(level.id);
    const stars = result?.bestStars ?? 0;
    if (stars > 0) return { status: "completed", stars };

    const isCurrent = level.id === progress.state.currentLevelId;
    const unlockedByPath = isCurrent;

    const unlockedByConfig = isLevelConfigUnlocked(props.unlocks, level);
    if (!unlockedByConfig) return { status: "locked", stars: 0, lockedHint: "需要先在解锁树中解锁该配置" };

    if (unlockedByPath) return { status: "unlocked", stars: 0 };
    return { status: "locked", stars: 0, lockedHint: "先通关当前关卡以解锁" };
  };

  const selectedLevel = selectedLevelId ? levelsById.get(selectedLevelId) ?? null : null;
  const selectedStatus = selectedLevel ? getNodeStatus(selectedLevel) : null;

  const closeStory = async () => {
    setShowStory(false);
    await markEpisodeViewed(activeEpisodeId);
  };

  const startSelected = async () => {
    if (!selectedLevel) return;
    const status = getNodeStatus(selectedLevel);
    if (status.status === "locked") return;

    const next = getNextLevelId(selectedLevel.episodeId, selectedLevel.orderInEpisode);
    props.onSetActiveCampaignRun({
      levelId: selectedLevel.id,
      episodeId: selectedLevel.episodeId,
      orderInEpisode: selectedLevel.orderInEpisode,
      minAccuracy: minAccuracyForLevel(selectedLevel),
      nextEpisodeId: next?.nextEpisodeId ?? selectedLevel.episodeId,
      nextLevelId: next?.nextLevelId ?? selectedLevel.id,
    });
    const args = buildStartArgs(selectedLevel);
    props.onStart(args.nLevel, args.rounds, args.mode, args.gridSize, args.mouseConfig, args.houseConfig);
  };

  const episode = episodes.find((e) => e.id === activeEpisodeId) ?? null;

  return (
    <div className="space-y-6 pt-6">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-zen-200">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zen-500">第 {activeEpisodeId} 章</div>
            <div className="text-xl font-semibold text-zen-800 truncate">{episode?.title ?? ""}</div>
            <div className="text-xs text-zen-400 mt-1 truncate">{episode?.description ?? ""}</div>
          </div>
          <div className="flex gap-2">
            <button
              className="w-9 h-9 rounded-full bg-zen-50 border border-zen-200 text-zen-500 hover:bg-zen-100 disabled:opacity-40"
              onClick={() => setActiveEpisodeId((e) => Math.max(1, e - 1))}
              disabled={activeEpisodeId <= 1}
            >
              ◀
            </button>
            <button
              className="w-9 h-9 rounded-full bg-zen-50 border border-zen-200 text-zen-500 hover:bg-zen-100 disabled:opacity-40"
              onClick={() => setActiveEpisodeId((e) => Math.min(episodes.length || 1, e + 1))}
              disabled={activeEpisodeId >= (episodes.length || 1)}
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      <div className="relative w-full h-[760px] bg-white rounded-[2rem] border border-zen-200 shadow-sm overflow-hidden">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e7e5e4" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <path d={mapPath} fill="none" stroke="#f5f5f4" strokeWidth="10" strokeLinecap="round" />
          <path d={mapPath} fill="none" stroke="#10b981" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
        </svg>

        {episodeLevels.map((lvl) => {
          const st = getNodeStatus(lvl);
          return (
            <CampaignMapNode
              key={lvl.id}
              id={lvl.orderInEpisode}
              x={lvl.mapPosition.x}
              y={lvl.mapPosition.y}
              status={st.status}
              stars={st.stars}
              isBoss={lvl.boss}
              lockedHint={st.lockedHint}
              onClick={() => setSelectedLevelId(lvl.id)}
            />
          );
        })}
      </div>

      {selectedLevel && selectedStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedLevelId(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-zen-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-gradient-to-br from-sage-500 to-sage-600 text-white">
              <div className="text-xs font-semibold opacity-90">{formatModeLabel(selectedLevel.gameMode)}</div>
              <div className="text-2xl font-bold mt-1">{selectedLevel.title}</div>
              <div className="text-xs opacity-90 mt-1">{formatLevelParams(selectedLevel)}</div>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-sm text-zen-600">
                通关条件：准确率 ≥ {minAccuracyForLevel(selectedLevel)}%
              </div>
              {selectedStatus.status === "locked" && selectedStatus.lockedHint ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">{selectedStatus.lockedHint}</div>
              ) : null}
              <button
                className="w-full py-3 rounded-xl bg-sage-500 text-white font-medium hover:bg-sage-600 disabled:bg-zen-300 disabled:cursor-not-allowed"
                onClick={() => void startSelected()}
                disabled={selectedStatus.status === "locked"}
              >
                开始训练
              </button>
              <button className="w-full py-2 text-sm text-zen-400 hover:text-zen-600" onClick={() => setSelectedLevelId(null)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {showStory && episode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur" onClick={() => void closeStory()}>
          <div className="w-full max-w-lg rounded-2xl bg-zen-900 text-white border border-zen-700 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-xs font-semibold text-sage-300 tracking-widest">接收到新讯息</div>
            <div className="text-2xl font-bold mt-2">{episode.title}</div>
            <div className="w-10 h-1 bg-sage-400 rounded-full mt-4" />
            <div className="mt-4 text-zen-100/90 whitespace-pre-line leading-relaxed">{episode.storyText}</div>
            <button className="mt-6 w-full py-3 rounded-xl bg-sage-500 hover:bg-sage-600 text-white font-semibold" onClick={() => void closeStory()}>
              确认接入
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
