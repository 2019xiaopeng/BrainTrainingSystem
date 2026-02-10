import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import type { SessionSummary, SessionHistoryEntry, UserProfile } from '../../types/game';

interface ResultScreenProps {
  summary: SessionSummary;
  sessionHistory: SessionHistoryEntry[];
  userProfile: UserProfile;
  unlockIds: string[];
  rewards: {
    xpEarned: number;
    unlockBonusCoins: number;
    dailyPerfectBonus: number;
    dailyFirstWinBonus: number;
    brainCoinsEarned: number;
    brainCoinsAfter: number;
    xpAfter: number;
    brainLevelBefore: number;
    brainLevelAfter: number;
    levelUp: boolean;
    energyConsumed: number;
    energyRefunded: number;
  } | null;
  onPlayAgain: () => void;
  onBackHome: () => void;
}

/**
 * ResultScreen - 结果展示界面
 */
export function ResultScreen({ summary, sessionHistory, userProfile, unlockIds, rewards, onPlayAgain, onBackHome }: ResultScreenProps) {
  const { t } = useTranslation();
  const [showLevelUp, setShowLevelUp] = useState(false);

  // Check for new achievements
  const isNewHighScore = summary.score && sessionHistory.length > 1 && 
    summary.score > Math.max(...sessionHistory.slice(0, -1).map(s => s.score));

  const formatUnlock = (id: string) => {
    const m = id.match(/^numeric_n_(\d+)_r_(\d+)$/);
    if (m) return t('unlock.numeric', { n: Number(m[1]), rounds: Number(m[2]) });
    const s1 = id.match(/^spatial_(\d+)x(\d+)_n_(\d+)$/);
    if (s1) return t('unlock.spatialN', { grid: `${s1[1]}×${s1[2]}`, n: Number(s1[3]) });
    const s2 = id.match(/^spatial_grid_(\d+)$/);
    if (s2) return t('unlock.spatialGrid', { grid: `${s2[1]}×${s2[1]}` });
    const md = id.match(/^mouse_difficulty_(easy|medium|hard|hell)$/);
    if (md) return t('unlock.mouseDifficulty', { difficulty: t(`difficulty.${md[1]}`) });
    const mm = id.match(/^mouse_mice_(\d+)$/);
    if (mm) return t('unlock.mouseMice', { count: Number(mm[1]) });
    const mr = id.match(/^mouse_rounds_(\d+)$/);
    if (mr) return t('unlock.mouseRounds', { rounds: Number(mr[1]) });
    const hs = id.match(/^house_speed_(easy|normal|fast)$/);
    if (hs) return t('unlock.houseSpeed', { speed: t(`speed.${hs[1]}`) });
    const he = id.match(/^house_events_(\d+)$/);
    if (he) return t('unlock.houseEvents', { events: Number(he[1]) });
    const hr = id.match(/^house_rounds_(\d+)$/);
    if (hr) return t('unlock.houseRounds', { rounds: Number(hr[1]) });
    return id;
  };

  const totalCoinsGained = rewards
    ? (rewards.brainCoinsEarned ?? 0) +
      (rewards.unlockBonusCoins ?? 0) +
      (rewards.dailyPerfectBonus ?? 0) +
      (rewards.dailyFirstWinBonus ?? 0)
    : 0;

  useEffect(() => {
    if (!rewards?.levelUp) return;
    setShowLevelUp(true);
  }, [rewards?.levelUp]);

  return (
    <div className="space-y-6 pt-8">
      <h1 className="text-3xl font-light text-zen-700 text-center animate-fade-in">{t('result.title')}</h1>

      <AnimatePresence>
        {showLevelUp && rewards?.levelUp && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLevelUp(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-indigo-500 to-rose-500 text-white shadow-2xl p-5"
              initial={{ y: 16, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 10, scale: 0.98, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-sm font-medium opacity-90">{t('result.levelUpTitle')}</div>
              <div className="mt-1 text-3xl font-bold tracking-wide">
                LV{rewards.brainLevelAfter}
              </div>
              <div className="mt-2 text-sm opacity-90">
                {t('result.levelUpDesc', { before: rewards.brainLevelBefore, after: rewards.brainLevelAfter })}
              </div>
              <button
                className="mt-4 w-full rounded-xl bg-white/15 hover:bg-white/20 active:bg-white/25 px-4 py-2 text-sm font-medium transition-colors"
                onClick={() => setShowLevelUp(false)}
              >
                {t('common.gotIt')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievement Badges */}
      {isNewHighScore && (
        <div className="flex gap-2 justify-center animate-bounce">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
            {t('result.newRecord')}
          </div>
        </div>
      )}

      {unlockIds.length > 0 && (
        <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-2xl p-5 shadow-lg animate-slide-up">
          <div className="text-sm font-medium">{t('result.newUnlock')}</div>
          <div className="mt-2 space-y-1">
            {unlockIds.map((id) => (
              <div key={id} className="text-sm font-semibold tracking-wide">
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
                {rewards.energyRefunded > 0 ? `-${rewards.energyConsumed} +${rewards.energyRefunded}` : `-${rewards.energyConsumed}`}
              </div>
              <div className="text-xs text-zen-400">{t('result.energy')}</div>
            </div>
          </div>
          {rewards.dailyPerfectBonus > 0 && (
            <div className="mt-3 text-xs text-sage-700 bg-sage-50 border border-sage-200/50 rounded-lg px-3 py-2">
              {t('result.dailyPerfectBonus', { coins: rewards.dailyPerfectBonus })}
            </div>
          )}
          {rewards.dailyFirstWinBonus > 0 && (
            <div className="mt-2 text-xs text-sage-700 bg-sage-50 border border-sage-200/50 rounded-lg px-3 py-2">
              {t('result.dailyFirstWinBonus', { coins: rewards.dailyFirstWinBonus })}
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
          className="w-full py-4 rounded-xl bg-sage-500 text-white text-lg font-medium
                     hover:bg-sage-600 active:scale-[0.98] transition-all shadow-sm"
        >
          {t('result.playAgain')}
        </button>
        <button
          onClick={onBackHome}
          className="w-full py-3 rounded-xl bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-[0.98] transition-all"
        >
          {t('result.backHome')}
        </button>
      </div>
    </div>
  );
}
