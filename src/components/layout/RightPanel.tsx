import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { TrendingUp } from 'lucide-react';

/**
 * RightPanel - 桌面端右侧仪表盘（最近训练记录）
 */
export function RightPanel() {
  const { t } = useTranslation();
  const { sessionHistory } = useGameStore();

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
                <div className="flex justify-between text-xs text-zen-400">
                  <span className="font-mono">{session.nLevel}-Back · {session.totalRounds}R</span>
                  <span>+{session.score} {t('result.points')}</span>
                </div>
                {/* Row 3: Time + RT */}
                <div className="flex justify-between text-xs text-zen-300 mt-1">
                  <span>{new Date(session.timestamp).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}</span>
                  {session.avgReactionTimeMs && (
                    <span>{t('rank.avgReaction', { seconds: (session.avgReactionTimeMs / 1000).toFixed(1) })}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
