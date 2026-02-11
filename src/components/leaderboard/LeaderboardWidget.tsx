import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

type CoinsEntry = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  brainCoins: number;
  brainLevel: number;
};

type LevelEntry = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  brainLevel: number;
  xp: number;
  brainCoins: number;
};

type CoinsPayload = {
  entries: CoinsEntry[];
  myRank: number | null;
  myEntry: CoinsEntry | null;
};

type LevelPayload = {
  entries: LevelEntry[];
  myRank: number | null;
  myEntry: LevelEntry | null;
};

export type LeaderboardKind = 'coins' | 'level';

export function LeaderboardWidget({ kind, compact }: { kind: LeaderboardKind; compact?: boolean }) {
  const auth = useGameStore((s) => s.userProfile.auth);
  const myUserId = auth?.status === 'authenticated' ? auth.userId : undefined;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coinsData, setCoinsData] = useState<CoinsPayload | null>(null);
  const [levelData, setLevelData] = useState<LevelPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const url = kind === 'coins' ? '/api/leaderboard/coins' : '/api/leaderboard/level';
        const resp = await fetch(url, { method: 'GET', credentials: 'include' });
        if (!resp.ok) throw new Error('fetch_failed');
        const data = (await resp.json()) as unknown;
        if (cancelled) return;
        if (kind === 'coins') setCoinsData(data as CoinsPayload);
        else setLevelData(data as LevelPayload);
      } catch {
        if (!cancelled) setError('加载失败，请稍后重试');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const data = kind === 'coins' ? coinsData : levelData;

  const entries = useMemo(() => {
    if (!data?.entries) return [];
    return data.entries;
  }, [data]);

  if (loading) {
    return (
      <div className={`bg-white/60 rounded-lg ${compact ? 'p-3' : 'p-4'} border border-zen-200/50 text-center text-xs text-zen-500`}>
        加载中…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`bg-white/60 rounded-lg ${compact ? 'p-3' : 'p-4'} border border-zen-200/50 text-center text-xs text-zen-500`}>
        {error ?? '暂无数据'}
      </div>
    );
  }

  const myRank = data.myRank;

  return (
    <div className="space-y-2">
      {typeof myRank === 'number' && (
        <div className={`bg-sage-50 rounded-lg ${compact ? 'p-3' : 'p-4'} border border-sage-200/60 text-xs text-sage-800`}>
          我的排名：#{myRank}
        </div>
      )}

      <div className="space-y-2">
        {entries.map((e) => {
          const isMe = Boolean(myUserId && (e as { userId?: string }).userId === myUserId);
          return (
            <div
              key={`${(e as { userId: string }).userId}-${(e as { rank: number }).rank}`}
              className={`flex items-center justify-between rounded-lg border ${compact ? 'p-3' : 'p-4'} ${
                isMe ? 'bg-amber-50 border-amber-200/60' : 'bg-white/60 border-zen-200/50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-7 text-center font-mono text-xs ${isMe ? 'text-amber-700' : 'text-zen-500'}`}>
                  #{(e as { rank: number }).rank}
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
                    {(e as CoinsEntry).brainCoins.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-zen-400">Brain Coins</div>
                </div>
              ) : (
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-zen-700">Lv {(e as LevelEntry).brainLevel}</div>
                  <div className="text-[11px] text-zen-400">XP {(e as LevelEntry).xp.toLocaleString()}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

