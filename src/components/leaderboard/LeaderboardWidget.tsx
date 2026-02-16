import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type CoinsEntry = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalScore: number;
  brainLevel: number;
  medal: 'gold' | 'silver' | 'bronze' | null;
};

type LevelEntry = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  brainLevel: number;
  xp: number;
  brainCoins: number;
  weeklyXp?: number;
  medal: 'gold' | 'silver' | 'bronze' | null;
};

type PublicCoinsPayload = {
  kind: 'coins';
  scope: 'all' | 'week';
  computedAt: string;
  entries: CoinsEntry[];
};

type PublicLevelPayload = {
  kind: 'level';
  scope: 'all' | 'week';
  computedAt: string;
  entries: LevelEntry[];
};

type MeCoinsPayload = {
  kind: 'coins';
  scope: 'all' | 'week';
  computedAt: string | null;
  myRank: number | null;
  myEntry: CoinsEntry | null;
};

type MeLevelPayload = {
  kind: 'level';
  scope: 'all' | 'week';
  computedAt: string | null;
  myRank: number | null;
  myEntry: LevelEntry | null;
};

export type LeaderboardKind = 'coins' | 'level';

export function LeaderboardWidget({
  kind,
  scope = 'all',
  compact,
}: {
  kind: LeaderboardKind;
  scope?: 'all' | 'week';
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coinsData, setCoinsData] = useState<PublicCoinsPayload | null>(null);
  const [levelData, setLevelData] = useState<PublicLevelPayload | null>(null);
  const [coinsMe, setCoinsMe] = useState<MeCoinsPayload | null>(null);
  const [levelMe, setLevelMe] = useState<MeLevelPayload | null>(null);
  const cacheRef = useRef<Record<string, { cachedAt: number; publicData: unknown; meData: unknown }>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const cacheKey = `${kind}:${scope}`;
        const cached = cacheRef.current[cacheKey];
        const ttlMs = 60_000;
        if (cached && Date.now() - cached.cachedAt < ttlMs) {
          if (kind === 'coins') {
            setCoinsData(cached.publicData as PublicCoinsPayload);
            setCoinsMe(cached.meData as MeCoinsPayload | null);
          } else {
            setLevelData(cached.publicData as PublicLevelPayload);
            setLevelMe(cached.meData as MeLevelPayload | null);
          }
          setLoading(false);
        }

        const url = kind === 'coins' ? '/api/leaderboard/coins' : '/api/leaderboard/level';
        const resp = await fetch(`${url}?scope=${encodeURIComponent(scope)}&_t=${Date.now()}`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        if (!resp.ok) {
          if (resp.status === 503) {
            setError(t('rank.errors.maintenance'));
            return;
          }
          if (resp.status === 401) {
            const body = await resp.json().catch(() => null);
            const code = String((body as { error?: unknown } | null)?.error ?? '');
            if (code === 'login_required') {
              setError(t('rank.errors.loginRequired'));
              return;
            }
          }
          if (resp.status === 400) {
            const body = await resp.json().catch(() => null);
            const code = String((body as { error?: unknown } | null)?.error ?? '');
            if (code === 'invalid_scope') {
              setError(t('rank.errors.weeklyDisabled'));
              return;
            }
          }
          throw new Error('fetch_failed');
        }
        const publicData = (await resp.json()) as unknown;
        if (cancelled) return;

        const meUrl = kind === 'coins' ? '/api/leaderboard/coins/me' : '/api/leaderboard/level/me';
        const meResp = await fetch(`${meUrl}?scope=${encodeURIComponent(scope)}&_t=${Date.now()}`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        const meData = meResp.ok ? ((await meResp.json().catch(() => null)) as unknown) : null;

        if (kind === 'coins') {
          setCoinsData(publicData as PublicCoinsPayload);
          setCoinsMe((meData as MeCoinsPayload) ?? null);
        } else {
          setLevelData(publicData as PublicLevelPayload);
          setLevelMe((meData as MeLevelPayload) ?? null);
        }

        cacheRef.current[cacheKey] = { cachedAt: Date.now(), publicData, meData };
      } catch {
        if (!cancelled) setError(t('rank.errors.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, scope]);

  const data = kind === 'coins' ? coinsData : levelData;
  const me = kind === 'coins' ? coinsMe : levelMe;

  const entries = useMemo(() => {
    if (!data?.entries) return [];
    return data.entries;
  }, [data]);

  if (loading) {
    return (
      <div className={`bg-white/60 rounded-lg ${compact ? 'p-3' : 'p-4'} border border-zen-200/50 text-center text-xs text-zen-500`}>
        {t('common.loading')}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`bg-white/60 rounded-lg ${compact ? 'p-3' : 'p-4'} border border-zen-200/50 text-center text-xs text-zen-500`}>
        {error ?? t('rank.empty')}
      </div>
    );
  }

  const myRank = me?.myRank ?? null;
  const myUserId = me?.myEntry?.userId ?? null;
  const medalEmoji = (m: 'gold' | 'silver' | 'bronze' | null) => (m === 'gold' ? '🥇' : m === 'silver' ? '🥈' : m === 'bronze' ? '🥉' : '');

  return (
    <div className="space-y-2">
      {typeof myRank === 'number' && (
        <div className={`bg-sage-50 rounded-lg ${compact ? 'p-3' : 'p-4'} border border-sage-200/60 text-xs text-sage-800`}>
          {t('rank.myRank', { rank: myRank })}
        </div>
      )}

      <div className="space-y-2">
        {entries.map((e) => {
          const isMe = myUserId ? (e as { userId?: string }).userId === myUserId : false;
          return (
            <div
              key={`${(e as { rank: number }).rank}-${(e as { displayName: string }).displayName}`}
              className={`flex items-center justify-between rounded-lg border ${compact ? 'p-3' : 'p-4'} ${
                isMe ? 'bg-amber-50 border-amber-200/60' : 'bg-white/60 border-zen-200/50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-7 text-center font-mono text-xs ${isMe ? 'text-amber-700' : 'text-zen-500'}`}>
                  {(e as { medal?: 'gold' | 'silver' | 'bronze' | null }).medal ? medalEmoji((e as { medal?: 'gold' | 'silver' | 'bronze' | null }).medal ?? null) : `#${(e as { rank: number }).rank}`}
                </div>
                <div className="w-8 h-8 rounded-full bg-zen-100 overflow-hidden flex items-center justify-center">
                  {(e as { avatarUrl: string | null }).avatarUrl ? (
                    <img src={(e as { avatarUrl: string }).avatarUrl} alt="" className="w-8 h-8 object-cover" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-zen-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className={`text-sm font-medium truncate ${isMe ? 'text-amber-900' : 'text-zen-700'}`}>
                    {(e as { displayName: string }).displayName}
                  </div>
                  <div className="text-[11px] text-zen-400 truncate">
                    Lv {(e as { brainLevel?: number }).brainLevel ?? 1}
                  </div>
                </div>
              </div>

              {kind === 'coins' ? (
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-zen-700">
                    {((e as CoinsEntry).totalScore ?? 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-zen-400">{t('rank.metrics.score')}</div>
                </div>
              ) : (
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-zen-700">
                    {t('rank.metrics.level', { level: (e as LevelEntry).brainLevel })}
                  </div>
                  <div className="text-[11px] text-zen-400">
                    {scope === 'week'
                      ? t('rank.metrics.weeklyXp', { xp: ((e as LevelEntry).weeklyXp ?? 0).toLocaleString() })
                      : t('rank.metrics.xp', { xp: (e as LevelEntry).xp.toLocaleString() })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
