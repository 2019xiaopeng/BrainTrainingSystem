import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';

/**
 * RightPanel - 桌面端右侧栏
 * 包含: 历史记录, 统计摘要
 */
export function RightPanel() {
  const { t } = useTranslation();
  const { sessionHistory } = useGameStore();

  // 取最近10条记录
  const recentSessions = [...sessionHistory].reverse().slice(0, 10);

  return (
    <div className="p-4 space-y-6">
      {/* 历史记录 */}
      <div>
        <h3 className="text-sm font-medium text-zen-600 dark:text-zen-300 mb-3">{t('sidebar.recentSessions')}</h3>
        {recentSessions.length === 0 ? (
          <p className="text-xs text-zen-400 dark:text-zen-500">{t('sidebar.noSessions')}</p>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((session, idx) => (
              <div key={idx} className="bg-white/50 dark:bg-zen-800/50 rounded-lg p-3 border border-zen-200/50 dark:border-zen-700/50 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-zen-700 dark:text-zen-200">{session.nLevel}-Back</span>
                  <span className={`font-medium ${session.accuracy >= 80 ? 'text-green-600 dark:text-green-400' : session.accuracy >= 50 ? 'text-amber-500 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}`}>
                    {session.accuracy}%
                  </span>
                </div>
                <div className="flex justify-between mt-1 text-zen-400 dark:text-zen-500">
                  <span>{session.totalRounds} {t('game.round', { current: '', total: '' }).includes('题') ? '题' : 'rounds'}</span>
                  <span>+{session.score} {t('result.points')}</span>
                </div>
                <div className="text-zen-300 dark:text-zen-600 mt-1">
                  {new Date(session.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
