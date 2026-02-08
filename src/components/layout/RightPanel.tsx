import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { Clock, Trophy, TrendingUp } from 'lucide-react';
import { CheckInWidget } from '../economy/CheckInWidget';

type DashboardTab = 'history' | 'leaderboard';
type LeaderboardLevel = '2back' | '3back';

/**
 * RightPanel - 桌面端右侧仪表盘
 * 包含: 历史记录, 排行榜 (Mock)
 */
export function RightPanel() {
  const { t } = useTranslation();
  const { sessionHistory, userProfile } = useGameStore();
  const [tab, setTab] = useState<DashboardTab>('history');
  const [lbLevel, setLbLevel] = useState<LeaderboardLevel>('2back');
  const isGuest = (userProfile.auth?.status ?? 'guest') === 'guest';

  // Take last 5 recent sessions
  const recentSessions = useMemo(
    () => [...sessionHistory].reverse().slice(0, 5),
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
    <div className="p-4 space-y-4">
      {/* Daily Check-in */}
      {!isGuest ? (
        <CheckInWidget />
      ) : (
        <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm">
          <div className="text-xs font-medium text-zen-700 mb-1">{t('profile.auth.guest')}</div>
          <div className="text-[11px] text-zen-500">{t('profile.auth.guestLockHint')}</div>
          <div className="mt-3 flex gap-2">
            <a
              href="/signup"
              className="flex-1 text-center px-3 py-2 rounded-lg bg-sage-500 text-white text-xs font-medium hover:bg-sage-600 transition-colors"
            >
              {t('profile.auth.goSignup')}
            </a>
            <a
              href="/signin"
              className="flex-1 text-center px-3 py-2 rounded-lg bg-zen-100 text-zen-700 text-xs font-medium hover:bg-zen-200 transition-colors"
            >
              {t('profile.auth.goSignin')}
            </a>
          </div>
        </div>
      )}

      {/* Tab switcher */}
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

      {/* History Tab */}
      {tab === 'history' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-zen-600">
              {t('sidebar.recentSessions')}
            </h3>
            <TrendingUp className="w-3.5 h-3.5 text-zen-400" />
          </div>

          {recentSessions.length === 0 ? (
            <p className="text-xs text-zen-400 text-center py-6">
              {t('sidebar.noSessions')}
            </p>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((session, idx) => (
                <div
                  key={idx}
                  className="bg-white/60 rounded-lg p-3 border border-zen-200/50"
                >
                  {/* Row 1: Mode + Accuracy */}
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{modeEmoji[session.mode || 'numeric']}</span>
                      <span className="text-xs font-medium text-zen-600">
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
                  {/* Row 2: Details */}
                  <div className="flex justify-between text-[10px] text-zen-400">
                    <span className="font-mono">{session.nLevel}-Back · {session.totalRounds}R</span>
                    <span>+{session.score} {t('result.points')}</span>
                  </div>
                  {/* Row 3: Time + RT */}
                  <div className="flex justify-between text-[10px] text-zen-300 mt-1">
                    <span>{new Date(session.timestamp).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}</span>
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

      {/* Leaderboard Tab */}
      {tab === 'leaderboard' && (
        <div className="space-y-3">
          {/* Level sub-tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setLbLevel('2back')}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                lbLevel === '2back'
                  ? 'bg-sage-100 text-sage-700'
                  : 'text-zen-400 hover:bg-zen-50'
              }`}
            >
              2-Back
            </button>
            <button
              onClick={() => setLbLevel('3back')}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                lbLevel === '3back'
                  ? 'bg-sage-100 text-sage-700'
                  : 'text-zen-400 hover:bg-zen-50'
              }`}
            >
              3-Back
            </button>
          </div>

          {/* Leaderboard list */}
          <div className="bg-white/60 rounded-lg p-4 border border-zen-200/50 text-center text-xs text-zen-500">
            {isGuest ? t('sidebar.leaderboardLoginRequired') : t('sidebar.leaderboardComingSoon')}
          </div>
        </div>
      )}
    </div>
  );
}
