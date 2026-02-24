import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CampaignMapNode } from "./CampaignMapNode";
import type { CampaignEpisode, CampaignLevel, CampaignProgress, CampaignProgressState } from "../../types/campaign";
import type { GameMode, HouseGameConfig, HouseSpeed, MouseDifficultyLevel, MouseGameConfig, MouseGridPreset, UserProfile } from "../../types/game";
import { buildHouseGameConfig, buildMouseGameConfig } from "../../types/game";
import { isLevelReachable, isEpisodeUnlocked } from "../../lib/campaign/unlocking";
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

// formatModeLabel and formatLevelParams moved inside component for i18n access

// (moved inside component)

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
  onStart: (nLevel: number, rounds: number, mode: GameMode, gridSize: number, mouseConfig?: MouseGameConfig, houseConfig?: HouseGameConfig) => void;
  onSetActiveCampaignRun: (run: null | { levelId: number; episodeId: number; orderInEpisode: number; minAccuracy: number; nextEpisodeId: number; nextLevelId: number }) => void;
  lastCampaignUpdate?: unknown;
  storyOpenNonce?: number;
}) {
  const { t } = useTranslation();
  const isGuest = (props.userProfile.auth?.status ?? "guest") === "guest";

  const [meta, setMeta] = useState<{ episodes: CampaignEpisode[]; levels: CampaignLevel[] } | null>(null);
  const [progress, setProgress] = useState<CampaignProgress>(defaultProgress);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [activeEpisodeId, setActiveEpisodeId] = useState<number>(1);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [showStory, setShowStory] = useState(false);
  const storyShownForRef = useRef<Set<number>>(new Set());

  const formatModeLabel = (mode: GameMode) => {
    if (mode === "numeric") return t("campaign.modeNumeric");
    if (mode === "spatial") return t("campaign.modeSpatial");
    if (mode === "mouse") return t("campaign.modeMouse");
    return t("campaign.modeHouse");
  };

  const formatLevelParams = (level: CampaignLevel) => {
    const cfg = level.config as Record<string, unknown>;
    if (level.gameMode === "numeric") return t("campaign.paramsNumeric", { n: clampInt(cfg.nLevel, 1), rounds: clampInt(cfg.rounds, 10) });
    if (level.gameMode === "spatial")
      return t("campaign.paramsSpatial", { grid: clampInt(cfg.gridSize, 3), n: clampInt(cfg.nLevel, 1), rounds: clampInt(cfg.rounds, 10) });
    if (level.gameMode === "mouse")
      return t("campaign.paramsMouse", {
        count: clampInt(cfg.count, 3),
        cols: String((cfg.grid as unknown[] | undefined)?.[0] ?? 4),
        rows: String((cfg.grid as unknown[] | undefined)?.[1] ?? 3),
        difficulty: t(`difficulty.${String(cfg.difficulty ?? "easy")}`),
        rounds: clampInt(cfg.rounds, 3),
      });
    return t("campaign.paramsHouse", {
      speed: t(`speed.${String(cfg.speed ?? "easy")}`),
      initial: clampInt(cfg.initialPeople, 3),
      events: clampInt(cfg.eventCount, 6),
      rounds: clampInt(cfg.rounds, 3),
    });
  };

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
      setProgressLoaded(true);
      return;
    }
    const resp = await fetch("/api/campaign/progress", { credentials: "include" }).catch(() => null);
    const json = resp && resp.ok ? await resp.json().catch(() => null) : null;
    const parsed = normalizeProgress(json);
    if (parsed) {
      setProgress(parsed);
    }
    setProgressLoaded(true);
  };

  useEffect(() => {
    void refreshProgress();
  }, [isGuest]);

  useEffect(() => {
    if (!props.lastCampaignUpdate) return;
    void refreshProgress();
  }, [props.lastCampaignUpdate]);

  useEffect(() => {
    if (!episodes.length || !progressLoaded) return;
    const viewed = new Set(progress.state.viewedEpisodeStoryIds ?? []);
    if (!viewed.has(activeEpisodeId) && !storyShownForRef.current.has(activeEpisodeId)) {
      storyShownForRef.current.add(activeEpisodeId);
      setShowStory(true);
    }
  }, [episodes.length, activeEpisodeId, progressLoaded, progress.state.viewedEpisodeStoryIds]);

  useEffect(() => {
    if (!props.storyOpenNonce) return;
    if (!episodes.length) return;
    setShowStory(true);
  }, [props.storyOpenNonce, episodes.length]);

  const theme = useMemo(() => {
    const palettes: Record<number, { accent: string; soft: string; path: string; bg: string; bgPattern: string }> = {
      1:  { accent: "#7a9584", soft: "#a7d3b3", path: "#5c7a66", bg: "from-[#f5f2e9] to-[#fdfcf8]", bgPattern: "dots" },
      2:  { accent: "#6b8c96", soft: "#99c4d0", path: "#4d737d", bg: "from-[#eef4f6] to-[#fdfcf8]", bgPattern: "grid" },
      3:  { accent: "#8c7a96", soft: "#c4aed0", path: "#6d5c7a", bg: "from-[#f3eff6] to-[#fdfcf8]", bgPattern: "waves" },
      4:  { accent: "#967a7a", soft: "#d0aeae", path: "#7a5c5c", bg: "from-[#f6efef] to-[#fdfcf8]", bgPattern: "cross" },
      5:  { accent: "#7a8495", soft: "#aeb8c4", path: "#5c6677", bg: "from-[#eff1f4] to-[#fdfcf8]", bgPattern: "dots" },
      6:  { accent: "#958a7a", soft: "#c4baae", path: "#776d5c", bg: "from-[#f4f1ec] to-[#fdfcf8]", bgPattern: "grid" },
      7:  { accent: "#7a9595", soft: "#aecfc4", path: "#5c7a7a", bg: "from-[#eff5f5] to-[#fdfcf8]", bgPattern: "waves" },
      8:  { accent: "#8a7a95", soft: "#bcaec4", path: "#6b5c7a", bg: "from-[#f2eff6] to-[#fdfcf8]", bgPattern: "cross" },
      9:  { accent: "#957a8a", soft: "#c4aebc", path: "#7a5c6b", bg: "from-[#f5eff3] to-[#fdfcf8]", bgPattern: "dots" },
      10: { accent: "#d4af37", soft: "#edd49c", path: "#b8931f", bg: "from-[#faf5e6] to-[#fdfcf8]", bgPattern: "grid" },
    };
    return palettes[activeEpisodeId] ?? palettes[1];
  }, [activeEpisodeId]);

  // Compute which episodes are navigable (unlocked)
  const unlockedEpisodeIds = useMemo(() => {
    return episodes.filter((ep) => isEpisodeUnlocked(ep.id, episodes, allLevels, progress.results)).map((ep) => ep.id);
  }, [episodes, allLevels, progress.results]);

  const jitteredPos = useMemo(() => {
    const cache = new Map<number, { x: number; y: number }>();
    return (lvl: CampaignLevel) => {
      const key = lvl.id * 1000 + activeEpisodeId;
      const cached = cache.get(key);
      if (cached) return cached;
      const seed = (lvl.id * 9301 + activeEpisodeId * 49297) % 233280;
      const r1 = (seed / 233280) * 2 - 1;
      const r2 = (((seed * 13) % 233280) / 233280) * 2 - 1;
      const dx = Math.round(r1 * 6);
      const dy = Math.round(r2 * 8);
      const pos = {
        x: Math.max(8, Math.min(92, lvl.mapPosition.x + dx)),
        y: Math.max(10, Math.min(90, lvl.mapPosition.y + dy)),
      };
      cache.set(key, pos);
      return pos;
    };
  }, [activeEpisodeId]);

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
    const p0 = jitteredPos(sorted[0]);
    let d = `M ${p0.x} ${p0.y}`;
    for (let i = 0; i < sorted.length - 1; i++) {
      const currPos = jitteredPos(sorted[i]);
      const nextPos = jitteredPos(sorted[i + 1]);
      const cp1x = currPos.x;
      const cp1y = (currPos.y + nextPos.y) / 2;
      const cp2x = nextPos.x;
      const cp2y = (currPos.y + nextPos.y) / 2;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${nextPos.x} ${nextPos.y}`;
    }
    return d;
  }, [episodeLevels, jitteredPos]);

  // Active (progress) path — only covers cleared levels
  const activeMapPath = useMemo(() => {
    if (episodeLevels.length < 2) return "";
    const sorted = [...episodeLevels].sort((a, b) => a.orderInEpisode - b.orderInEpisode);
    let d = "";
    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i];
      const currResult = resultsById.get(curr.id);
      if (!currResult || currResult.bestStars < 1) break;
      const currPos = jitteredPos(curr);
      const nextPos = jitteredPos(sorted[i + 1]);
      if (i === 0) d += `M ${currPos.x} ${currPos.y}`;
      const cp1x = currPos.x;
      const cp1y = (currPos.y + nextPos.y) / 2;
      const cp2x = nextPos.x;
      const cp2y = (currPos.y + nextPos.y) / 2;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${nextPos.x} ${nextPos.y}`;
    }
    return d;
  }, [episodeLevels, resultsById, jitteredPos]);

  const getNodeStatus = (level: CampaignLevel): { status: NodeStatus; stars: number; lockedHint?: string } => {
    const result = resultsById.get(level.id);
    const stars = result?.bestStars ?? 0;
    if (stars > 0) return { status: "completed", stars };

    const reachable = isLevelReachable(level, allLevels, progress.results);
    if (reachable) return { status: "unlocked", stars: 0 };
    return { status: "locked", stars: 0, lockedHint: t("campaign.lockedHint") };
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

  // Episode total stars / max stars
  const episodeStarStats = useMemo(() => {
    const total = episodeLevels.reduce((sum, l) => sum + (resultsById.get(l.id)?.bestStars ?? 0), 0);
    return { earned: total, max: episodeLevels.length * 3 };
  }, [episodeLevels, resultsById]);

  // Background pattern SVG per bgPattern type
  const bgPatternSvg = useMemo(() => {
    const pid = `pattern-${activeEpisodeId}`;
    if (theme.bgPattern === "dots") {
      return (
        <pattern id={pid} width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="#e6e2d6" />
        </pattern>
      );
    }
    if (theme.bgPattern === "waves") {
      return (
        <pattern id={pid} width="60" height="20" patternUnits="userSpaceOnUse">
          <path d="M 0 10 Q 15 0 30 10 T 60 10" fill="none" stroke="#e6e2d6" strokeWidth="1" />
        </pattern>
      );
    }
    if (theme.bgPattern === "cross") {
      return (
        <pattern id={pid} width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 15 10 L 15 20 M 10 15 L 20 15" fill="none" stroke="#e6e2d6" strokeWidth="1" />
        </pattern>
      );
    }
    // default: grid
    return (
      <pattern id={pid} width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e6e2d6" strokeWidth="1" />
      </pattern>
    );
  }, [activeEpisodeId, theme.bgPattern]);

  return (
    <div className="space-y-5 pt-4">
      {/* Episode Header — warm card */}
      <div className="bg-[#fdfcf8] rounded-2xl p-5 shadow-sm border border-[#ece8dc]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <button
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#ece8dc] hover:border-[#d6d3c4] shadow-sm text-[#a8a29e] hover:text-slate-700 disabled:opacity-30 transition-all"
                onClick={() => {
                  const curIdx = unlockedEpisodeIds.indexOf(activeEpisodeId);
                  if (curIdx > 0) setActiveEpisodeId(unlockedEpisodeIds[curIdx - 1]);
                }}
                disabled={unlockedEpisodeIds.indexOf(activeEpisodeId) <= 0}
              >
                ◀
              </button>
              <h2 className="text-2xl font-bold text-slate-700 tracking-tight">{t('campaign.chapter', { n: activeEpisodeId })}</h2>
              <button
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#ece8dc] hover:border-[#d6d3c4] shadow-sm text-[#a8a29e] hover:text-slate-700 disabled:opacity-30 transition-all"
                onClick={() => {
                  const curIdx = unlockedEpisodeIds.indexOf(activeEpisodeId);
                  if (curIdx >= 0 && curIdx < unlockedEpisodeIds.length - 1) setActiveEpisodeId(unlockedEpisodeIds[curIdx + 1]);
                }}
                disabled={unlockedEpisodeIds.indexOf(activeEpisodeId) >= unlockedEpisodeIds.length - 1}
              >
                ▶
              </button>
              <button
                className="ml-1 text-xs px-3 py-1.5 rounded-full border border-[#ece8dc] text-[#8c887e] hover:bg-white hover:shadow-sm hover:text-slate-700 transition-all"
                onClick={() => setShowStory(true)}
              >
                {t('campaign.storyButton')}
              </button>
            </div>
            <p className="text-[#8c887e] text-xs font-medium tracking-wide pl-12 border-l-2 ml-3" style={{ borderColor: theme.accent }}>
              {episode?.title ?? ""}
              {episode?.description ? ` — ${episode.description}` : ""}
            </p>
          </div>

          {/* Episode star stats */}
          <div className="bg-white px-4 py-2.5 rounded-2xl border border-[#ece8dc] shadow-sm flex items-center gap-2 flex-shrink-0">
            <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-bold text-slate-700">{episodeStarStats.earned}/{episodeStarStats.max}</span>
          </div>
        </div>
      </div>

      {/* ===== CAMPAIGN MAP CONTAINER ===== */}
      <div className={`relative w-full h-[850px] bg-gradient-to-br ${theme.bg} rounded-[2.5rem] border border-[#ece8dc] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] overflow-hidden group`}>

        {/* 1. Background Pattern */}
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <svg width="100%" height="100%">
            <defs>{bgPatternSvg}</defs>
            <rect width="100%" height="100%" fill={`url(#pattern-${activeEpisodeId})`} />
          </svg>
        </div>

        {/* 2. Topographic Contour Lines */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="none">
            <path d="M0,100 Q100,50 200,100 T400,100" fill="none" stroke={theme.accent} strokeWidth="2" />
            <path d="M0,200 Q150,150 250,200 T400,180" fill="none" stroke={theme.accent} strokeWidth="2" />
            <path d="M0,350 Q80,300 180,350 T400,400" fill="none" stroke={theme.accent} strokeWidth="2" />
            <path d="M0,550 Q120,500 220,550 T400,600" fill="none" stroke={theme.accent} strokeWidth="2" />
            <path d="M0,700 Q180,650 280,700 T400,750" fill="none" stroke={theme.accent} strokeWidth="2" />
          </svg>
        </div>

        {/* 3. Floating Geometric Particles */}
        <div className="absolute top-20 left-10 w-4 h-4 rounded-full border opacity-20 animate-[float_6s_ease-in-out_infinite]" style={{ borderColor: theme.accent }} />
        <div className="absolute bottom-40 right-20 w-6 h-6 rotate-45 border border-[#d6d3c4] opacity-20 animate-[float_8s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-1/2 left-20 w-2 h-2 rounded-full opacity-10 animate-pulse" style={{ backgroundColor: theme.accent }} />
        <div className="absolute top-1/3 right-16 w-3 h-3 rounded-full border opacity-15 animate-[float_7s_ease-in-out_infinite]" style={{ borderColor: theme.soft }} />

        {/* 4. Connecting Lines — Base + Active */}
        <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`pathGrad-${activeEpisodeId}`} x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.2" />
              <stop offset="100%" stopColor={theme.accent} stopOpacity="0.8" />
            </linearGradient>
          </defs>
          {/* Shadow / base line */}
          <path d={mapPath} fill="none" stroke="#e6e2d6" strokeWidth="10" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {/* Active signal line (progress) */}
          {activeMapPath && (
            <path d={activeMapPath} fill="none" stroke={theme.accent} strokeWidth="3" strokeLinecap="round" className="drop-shadow-sm" vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        {/* 5. Map Nodes */}
        {episodeLevels.map((lvl) => {
          const st = getNodeStatus(lvl);
          const pos = jitteredPos(lvl);
          return (
            <CampaignMapNode
              key={lvl.id}
              id={lvl.orderInEpisode}
              x={pos.x}
              y={pos.y}
              status={st.status}
              stars={st.stars}
              isBoss={lvl.boss}
              themeColor={theme.accent}
              lockedHint={st.lockedHint}
              onClick={() => setSelectedLevelId(lvl.id)}
            />
          );
        })}

        {/* Start marker */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
          <div className="w-1.5 h-1.5 rounded-full bg-[#a8a29e] mb-1" />
          <span className="text-[10px] font-bold text-[#a8a29e] uppercase tracking-widest">{t('campaign.startPoint')}</span>
        </div>
      </div>

      {/* ===== LEVEL DETAIL MODAL ===== */}
      {selectedLevel && selectedStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#57534e]/20 backdrop-blur-sm" onClick={() => setSelectedLevelId(null)}>
          <div className="bg-[#fdfcf8] rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-white/60" onClick={(e) => e.stopPropagation()}>
            {/* Theme-colored gradient header */}
            <div className="h-32 relative overflow-hidden flex items-end p-6" style={{ background: `linear-gradient(to bottom right, ${theme.accent}, ${theme.accent}dd)` }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\"><path d=\"M40 0 L0 0 0 40\" fill=\"none\" stroke=\"white\" stroke-width=\"0.5\"/></svg>')" }} />
              <div className="text-white relative z-10 w-full">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[10px] font-mono opacity-90 mb-1 px-2 py-0.5 bg-white/10 rounded inline-block backdrop-blur-sm border border-white/10">
                      {formatModeLabel(selectedLevel.gameMode)}
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight">{selectedLevel.title}</h3>
                    <div className="text-xs opacity-80 mt-1">{formatLevelParams(selectedLevel)}</div>
                  </div>
                  {selectedStatus.stars > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {[1, 2, 3].map((s) => (
                        <svg key={s} className={`w-5 h-5 ${s <= selectedStatus.stars ? "text-yellow-300 fill-current" : "text-white/30 fill-current"}`} viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Pass condition */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-2xl border border-[#ece8dc] text-center shadow-sm">
                  <div className="text-[10px] text-[#9ca3af] uppercase font-bold mb-0.5">{t('campaign.passThreshold')}</div>
                  <div className="text-xl font-bold text-slate-700">{minAccuracyForLevel(selectedLevel)}%</div>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-[#ece8dc] text-center shadow-sm">
                  <div className="text-[10px] text-[#9ca3af] uppercase font-bold mb-0.5">{t('campaign.bestRecord')}</div>
                  <div className="text-xl font-bold text-slate-700">
                    {resultsById.get(selectedLevel.id)?.bestAccuracy ? `${resultsById.get(selectedLevel.id)!.bestAccuracy}%` : "—"}
                  </div>
                </div>
              </div>

              {selectedStatus.status === "locked" && selectedStatus.lockedHint ? (
                <div className="rounded-xl bg-amber-50 border border-[#fcd34d]/30 p-3 text-xs text-amber-800 font-semibold flex items-center gap-2">
                  <span>🔒</span> {selectedStatus.lockedHint}
                </div>
              ) : null}

              <button
                className="w-full py-4 rounded-2xl text-white font-bold shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: selectedStatus.status === "locked" ? "#d1ccc0" : theme.accent }}
                onClick={() => void startSelected()}
                disabled={selectedStatus.status === "locked"}
              >
                <span>{t('campaign.startTraining')}</span>
                <div className="flex items-center bg-white/10 px-2 py-0.5 rounded text-xs border border-white/10">
                  <span className="text-yellow-300 mr-1">⚡</span>1
                </div>
              </button>

              <button className="w-full py-2 text-sm text-[#9ca3af] hover:text-slate-600 font-medium" onClick={() => setSelectedLevelId(null)}>
                {t('campaign.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== STORY MODAL ===== */}
      {showStory && episode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#292524]/90 backdrop-blur-md" onClick={() => void closeStory()}>
          <div className="bg-[#1c1917] text-white rounded-[2rem] max-w-lg w-full p-8 border border-[#44403c] shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none" style={{ backgroundColor: theme.accent }} />

            <div className="relative z-10">
              <div className="text-xs font-mono mb-4 uppercase tracking-widest flex items-center gap-2" style={{ color: theme.accent }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.accent }} />
                {t('campaign.newMessage')}
              </div>
              <div className="text-3xl font-bold tracking-tight">{episode.title}</div>
              <div className="w-10 h-1 rounded-full mt-4" style={{ backgroundColor: theme.accent }} />
              <div className="mt-4 text-[#d6d3d1] leading-relaxed whitespace-pre-line font-light text-lg">{episode.storyText}</div>
              <button
                className="mt-8 w-full py-4 text-white font-bold rounded-xl transition-colors"
                style={{ backgroundColor: theme.accent, boxShadow: `0 0 20px ${theme.accent}4d` }}
                onClick={() => void closeStory()}
              >
                {t('campaign.confirmEnter')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
