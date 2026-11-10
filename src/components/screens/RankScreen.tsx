import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

/**
 * RankScreen - 训练历史（移动端承载右栏内容）
 */
export function RankScreen() {
  const { t } = useTranslation();
  const { sessionHistory } = useGameStore();

  const recentSessions = useMemo(
    () => [...sessionHistory].reverse().slice(0, 20),
    [sessionHistory]
  );

  const modeEmoji: Record<string, string> = {
    numeric: '🔢',
    spatial: '🎯',
    mouse: '🐭',
    house: '🏠',
    reaction: '⚡',
    numberMemory: '🧠',
  };

  const modeLabels: Record<string, string> = {
    numeric: t('home.numeric'),
    spatial: t('home.spatial'),
    mouse: t('home.mouse'),
    house: t('home.house'),
    reaction: t('home.reaction'),
    numberMemory: t('home.numberMemory'),
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-zen-700">{t('sidebar.history')}</h1>
        <TrendingUp className="w-4 h-4 text-zen-400" />
      </div>

      {recentSessions.length === 0 ? (
        <p className="text-sm text-zen-400 text-center py-10">{t('sidebar.noSessions')}</p>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zen-600">{t('sidebar.recentSessions')}</h3>
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
                  <span>{t('rank.avgReaction', { seconds: (session.avgReactionTimeMs / 1000).toFixed(1) })}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
