/**
 * Hook to derive GameUnlocks from campaign progress.
 * Free training config limits are determined by what campaign levels
 * the user has cleared (>= 1 star).
 */
import { useState, useEffect } from "react";
import type { GameUnlocks } from "../types/game";
import type { CampaignLevel, CampaignLevelResult } from "../types/campaign";
import { deriveUnlocksFromCampaign } from "../lib/campaign/unlocking";
import { readGuestCampaignProgress } from "../lib/campaign/guestProgress";

const clampInt = (n: unknown, fallback = 0) => (Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : fallback);

const parseLevels = (raw: unknown): CampaignLevel[] => {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.levels)) return [];
  return r.levels
    .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : null))
    .filter((x): x is Record<string, unknown> => Boolean(x))
    .map((x) => {
      const mapPos = x.mapPosition && typeof x.mapPosition === "object" ? (x.mapPosition as Record<string, unknown>) : {};
      return {
        id: clampInt(x.id, 0),
        episodeId: clampInt(x.episodeId, 0),
        orderInEpisode: clampInt(x.orderInEpisode, 0),
        title: String(x.title ?? ""),
        gameMode: String(x.gameMode ?? "numeric") as CampaignLevel["gameMode"],
        config: (x.config && typeof x.config === "object" ? x.config : {}) as Record<string, unknown>,
        passRule: (x.passRule && typeof x.passRule === "object" ? x.passRule : {}) as Record<string, unknown>,
        boss: Boolean(x.boss),
        mapPosition: { x: clampInt(mapPos.x, 50), y: clampInt(mapPos.y, 50) },
      } satisfies CampaignLevel;
    })
    .filter((l) => l.id > 0);
};

const parseResults = (raw: unknown): CampaignLevelResult[] => {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.results)) return [];
  return r.results
    .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : null))
    .filter((x): x is Record<string, unknown> => Boolean(x))
    .map((x) => ({
      levelId: Math.max(1, clampInt(x.levelId, 1)),
      bestStars: Math.max(0, Math.min(3, clampInt(x.bestStars, 0))),
      bestAccuracy: Math.max(0, Math.min(100, clampInt(x.bestAccuracy, 0))),
      bestScore: x.bestScore == null ? null : clampInt(x.bestScore, 0),
      clearedAt: x.clearedAt ? new Date(String(x.clearedAt)).getTime() : null,
    }));
};

export function useCampaignUnlocks(isGuest: boolean, lastCampaignUpdate?: unknown): GameUnlocks | null {
  const [unlocks, setUnlocks] = useState<GameUnlocks | null>(null);

  useEffect(() => {
    let cancelled = false;

    const compute = async () => {
      try {
        // Fetch campaign meta (levels)
        const metaResp = await fetch("/api/campaign/meta").catch(() => null);
        const metaJson = metaResp && metaResp.ok ? await metaResp.json().catch(() => null) : null;
        const levels = parseLevels(metaJson);
        if (levels.length === 0 || cancelled) return;

        let results: CampaignLevelResult[];
        if (isGuest) {
          results = readGuestCampaignProgress().results;
        } else {
          const progResp = await fetch("/api/campaign/progress", { credentials: "include" }).catch(() => null);
          const progJson = progResp && progResp.ok ? await progResp.json().catch(() => null) : null;
          results = parseResults(progJson);
        }

        if (!cancelled) {
          setUnlocks(deriveUnlocksFromCampaign(levels, results));
        }
      } catch {
        // On error, keep null (defaults will be used)
      }
    };

    void compute();
    return () => { cancelled = true; };
  }, [isGuest, lastCampaignUpdate]);

  return unlocks;
}
