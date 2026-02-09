import { useTranslation } from 'react-i18next';
import type { SessionSummary, SessionHistoryEntry, UserProfile } from '../../types/game';

interface ResultScreenProps {
  summary: SessionSummary;
  sessionHistory: SessionHistoryEntry[];
  userProfile: UserProfile;
  unlockIds: string[];
  isSyncing: boolean;
  syncError: string | null;
  rewards: {
    xpEarned: number;
    unlockBonusCoins: number;
    dailyPerfectBonus: number;
    brainCoinsEarned: number;
    brainCoinsAfter: number;
    xpAfter: number;
    brainLevelAfter: number;
    energyConsumed: number;
    energyRefunded: number;
  } | null;
  onPlayAgain: () => void;
  onBackHome: () => void;
}

/**
 * ResultScreen - 结果展示界面
 */
export function ResultScreen({ summary, sessionHistory, userProfile, unlockIds, isSyncing, syncError, rewards, onPlayAgain, onBackHome }: ResultScreenProps) {
  const { t } = useTranslation();

  // Check for new achievements
  const isNewHighScore = summary.score && sessionHistory.length > 1 && 
    summary.score > Math.max(...sessionHistory.slice(0, -1).map(s => s.score));
  
  const isNewMaxNLevel = summary.accuracy >= 80 && summary.config.nLevel === userProfile.maxNLevel &&
    sessionHistory.length > 1;

  const formatUnlock = (id: string) => {
    const m = id.match(/^numeric_n_(\d+)_r_(\d+)$/);
    if (m) return t('unlock.numeric', { n: m[1], rounds: m[2] });
    return id;
  };

  const totalCoinsGained = rewards
    ? (rewards.brainCoinsEarned ?? 0) + (rewards.unlockBonusCoins ?? 0) + (rewards.dailyPerfectBonus ?? 0)
    : 0;

  return (
    <div className="space-y-6 pt-8">
      <h1 className="text-3xl font-light text-zen-700 text-center animate-fade-in">{t('result.title')}</h1>

      {(isSyncing || syncError) && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow border border-zen-200 animate-slide-up">
          <div className="text-sm font-medium text-zen-700">
            {isSyncing ? t('result.syncing') : t('result.syncFailed')}
          </div>
          {syncError && (
            <div className="text-xs text-zen-400 mt-1">{syncError}</div>
          )}
        </div>
      )}

      {/* Achievement Badges */}
      {(isNewHighScore || isNewMaxNLevel) && (
        <div className="flex gap-2 justify-center animate-bounce">
          {isNewHighScore && (
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              {t('result.newRecord')}
            </div>
          )}
          {isNewMaxNLevel && (
            <div className="bg-gradient-to-r from-purple-400 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              {t('result.newLevel')}
            </div>
          )}
        </div>
      )}

      {unlockIds.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow border border-zen-200 animate-slide-up">
          <div className="text-sm font-medium text-zen-700 mb-2">{t('result.unlocksTitle')}</div>
          <div className="flex flex-wrap gap-2">
            {unlockIds.map((id) => (
              <div key={id} className="text-xs px-2.5 py-1 rounded-full bg-sage-50 text-sage-700 border border-sage-200/50">
                {formatUnlock(id)}
              </div>
            ))}
          </div>
        </div>
      )}

      {rewards && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow border border-zen-200 animate-slide-up">
          <div className="text-sm font-medium text-zen-700 mb-2">{t('result.rewardsTitle')}</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-zen-50 rounded-xl p-3">
              <div className="text-lg font-mono text-zen-700">+{rewards.xpEarned}</div>
              <div className="text-xs text-zen-400">{t('result.xp')}</div>
            </div>
            <div className="bg-zen-50 rounded-xl p-3">
              <div className="text-lg font-mono text-zen-700">+{totalCoinsGained}</div>
              <div className="text-xs text-zen-400">{t('result.brainCoins')}</div>
            </div>
            <div className="bg-zen-50 rounded-xl p-3">
              <div className="text-lg font-mono text-zen-700">
                {rewards.energyRefunded > 0 ? '0' : `-${rewards.energyConsumed}`}
              </div>
              <div className="text-xs text-zen-400">{t('result.energy')}</div>
            </div>
          </div>
          {rewards.dailyPerfectBonus > 0 && (
            <div className="mt-3 text-xs text-sage-700 bg-sage-50 border border-sage-200/50 rounded-lg px-3 py-2">
              {t('result.dailyPerfectBonus', { coins: rewards.dailyPerfectBonus })}
            </div>
          )}
        </div>
      )}

      {/* 成绩卡片 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-zen-200 space-y-4 animate-slide-up">
        <div className="text-center">
          <div className="text-6xl font-light text-sage-600">{summary.accuracy}%</div>
          <div className="text-sm text-zen-400 mt-1">{t('result.accuracy')}</div>
          {summary.score && (
            <div className="text-lg font-medium text-zen-600 mt-2">+{summary.score} {t('result.points')}</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-zen-50 rounded-xl p-3">
            <div className="text-2xl font-mono text-zen-700">{summary.config.nLevel}-Back</div>
            <div className="text-xs text-zen-400">{t('result.difficulty')}</div>
          </div>
          <div className="bg-zen-50 rounded-xl p-3">
            <div className="text-2xl font-mono text-zen-700">
              {summary.avgReactionTimeMs}
              <span className="text-sm">ms</span>
            </div>
            <div className="text-xs text-zen-400">{t('result.avgReaction')}</div>
          </div>
        </div>

        {/* 详细统计 */}
        <div className="grid grid-cols-3 gap-3 text-center text-xs border-t border-zen-200 pt-4">
          <div>
            <div className="text-2xl font-mono text-green-600">{summary.correctCount}</div>
            <div className="text-zen-400">{t('result.correct')}</div>
          </div>
          <div>
            <div className="text-2xl font-mono text-red-500">{summary.incorrectCount}</div>
            <div className="text-zen-400">{t('result.wrong')}</div>
          </div>
          <div>
            <div className="text-2xl font-mono text-zen-400">{summary.missedCount}</div>
            <div className="text-zen-400">{t('result.timeout')}</div>
          </div>
        </div>

        <div className="text-center text-xs text-zen-400 pt-2 border-t border-zen-200">
          {t('result.duration', { time: (summary.durationMs / 1000).toFixed(1), rounds: summary.totalRounds })}
        </div>
      </div>



      {/* 操作按钮 */}
      <div className="space-y-3">
        <button
          onClick={onPlayAgain}
          disabled={isSyncing}
          className="w-full py-4 rounded-xl bg-sage-500 text-white text-lg font-medium
                     hover:bg-sage-600 active:scale-[0.98] transition-all shadow-sm"
        >
          {t('result.playAgain')}
        </button>
        <button
          onClick={onBackHome}
          disabled={isSyncing}
          className="w-full py-3 rounded-xl bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-[0.98] transition-all"
        >
          {t('result.backHome')}
        </button>
      </div>
    </div>
  );
}
