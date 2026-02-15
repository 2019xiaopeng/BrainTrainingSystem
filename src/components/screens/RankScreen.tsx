import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, TrendingUp, Trophy, Coins } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { LeaderboardWidget } from '../leaderboard/LeaderboardWidget';

type DashboardTab = 'history' | 'leaderboard';
type LeaderboardTab = 'coins' | 'level';

export function RankScreen() {
  const { t } = useTranslation();
  const { sessionHistory, userProfile } = useGameStore();
  const [tab, setTab] = useState<DashboardTab>('history');
  const [lbTab, setLbTab] = useState<LeaderboardTab>('coins');
  const [lbScope, setLbScope] = useState<'all' | 'week'>('all');

  const recentSessions = useMemo(
    () => [...sessionHistory].reverse().slice(0, 20),
    [sessionHistory]
  );

  const modeEmoji: Record<string, string> = {
    numeric: '🔢',
    spatial: '🎯',
    mouse: '🐭',
    house: '🏠',
  };

  const modeLabels: Record<string, string> = {
    numeric: t('home.numeric'),
    spatial: t('home.spatial'),
    mouse: t('home.mouse'),
    house: t('home.house'),
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-zen-700">{t('nav.rank')}</h1>
        <TrendingUp className="w-4 h-4 text-zen-400" />
      </div>

      <div className="flex bg-zen-100 rounded-lg p-0.5">
        <button
          onClick={() => setTab('history')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
            tab === 'history'
              ? 'bg-white text-zen-700 shadow-sm'
              : 'text-zen-400 hover:text-zen-600'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          {t('sidebar.history')}
        </button>
        <button
          onClick={() => setTab('leaderboard')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
            tab === 'leaderboard'
              ? 'bg-white text-zen-700 shadow-sm'
              : 'text-zen-400 hover:text-zen-600'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          {t('sidebar.leaderboard')}
        </button>
      </div>

      {tab === 'history' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zen-600">{t('sidebar.recentSessions')}</h3>
          </div>

          {recentSessions.length === 0 ? (
            <p className="text-sm text-zen-400 text-center py-10">{t('sidebar.noSessions')}</p>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((session, idx) => (
                <div key={idx} className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{modeEmoji[session.mode || 'numeric']}</span>
                      <span className="text-sm font-medium text-zen-700">
                        {modeLabels[session.mode || 'numeric']}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        session.accuracy >= 80
                          ? 'text-green-600'
                          : session.accuracy >= 50
                            ? 'text-amber-500'
                            : 'text-red-500'
                      }`}
                    >
                      {session.accuracy}%
                    </span>
                  </div>

                  <div className="flex justify-between text-xs text-zen-500">
                    <span className="font-mono">{session.nLevel}-Back · {session.totalRounds}R</span>
                    <span>+{session.score} {t('result.points')}</span>
                  </div>

                  <div className="flex justify-between text-xs text-zen-400 mt-1">
                    <span>
                      {new Date(session.timestamp).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    {session.avgReactionTimeMs && (
                      <span>{(session.avgReactionTimeMs / 1000).toFixed(1)}s avg</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setLbTab('coins');
                setLbScope('all');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                lbTab === 'coins'
                  ? 'bg-sage-100 text-sage-700'
                  : 'bg-white text-zen-400 border border-zen-200/50 hover:bg-zen-50'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <Coins className="w-3.5 h-3.5" />
                积分榜
              </span>
            </button>
            <button
              onClick={() => setLbTab('level')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                lbTab === 'level'
                  ? 'bg-sage-100 text-sage-700'
                  : 'bg-white text-zen-400 border border-zen-200/50 hover:bg-zen-50'
              }`}
            >
              段位榜
            </button>
          </div>

          {lbTab === 'level' && (
            <div className="flex gap-2">
              <button
                onClick={() => setLbScope('all')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  lbScope === 'all'
                    ? 'bg-zen-800 text-white'
                    : 'bg-white text-zen-400 border border-zen-200/50 hover:bg-zen-50'
                }`}
              >
                总榜
              </button>
              <button
                onClick={() => setLbScope('week')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  lbScope === 'week'
                    ? 'bg-zen-800 text-white'
                    : 'bg-white text-zen-400 border border-zen-200/50 hover:bg-zen-50'
                }`}
              >
                周榜
              </button>
            </div>
          )}

          <LeaderboardWidget kind={lbTab} scope={lbTab === 'level' ? lbScope : 'all'} />
        </div>
      )}
    </div>
  );
}

