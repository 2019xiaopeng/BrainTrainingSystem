import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import type { SessionSummary } from '../../types/game';

interface CampaignUpdate {
  levelId: number;
  stars: number;
  prevBestStars: number;
  passed: boolean;
  isFirstClear: boolean;
  starBonusCoins: number;
  firstClearBonus: number;
  nextLevelId: number | null;
  nextEpisodeId: number | null;
}

interface CampaignResultScreenProps {
  summary: SessionSummary;
  campaignUpdate: CampaignUpdate;
  lastRewards: {
    xpEarned: number;
    brainCoinsEarned: number;
    unlockBonusCoins: number;
    dailyPerfectBonus: number;
    dailyFirstWinBonus: number;
  } | null;
  activeCampaignRun: {
    levelId: number;
    episodeId: number;
    orderInEpisode: number;
    minAccuracy: number;
    nextEpisodeId: number;
    nextLevelId: number;
  };
  onNextLevel: () => void;
  onRetry: () => void;
  onBackToMap: () => void;
}

const StarIcon = ({ filled, delay, size = 48 }: { filled: boolean; delay: number; size?: number }) => (
  <motion.div
    initial={{ scale: 0, rotate: -180, opacity: 0 }}
    animate={filled ? { scale: 1, rotate: 0, opacity: 1 } : { scale: 1, rotate: 0, opacity: 0.2 }}
    transition={{ type: 'spring', stiffness: 260, damping: 20, delay }}
  >
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#f59e0b' : 'none'} stroke={filled ? '#d97706' : '#d1d5db'} strokeWidth="1.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  </motion.div>
);

export function CampaignResultScreen({
  summary,
  campaignUpdate,
  lastRewards,
  activeCampaignRun,
  onNextLevel,
  onRetry,
  onBackToMap,
}: CampaignResultScreenProps) {
  const { t } = useTranslation();
  const [showRewards, setShowRewards] = useState(false);

  const { stars, passed, prevBestStars, isFirstClear, starBonusCoins, firstClearBonus } = campaignUpdate;
  const hasNextLevel = campaignUpdate.nextLevelId !== null && passed;
  const isNewBest = stars > prevBestStars;

  useEffect(() => {
    // Show rewards after star animation
    const timer = setTimeout(() => setShowRewards(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // How far from the pass threshold
  const accuracyGap = useMemo(() => {
    const min = activeCampaignRun.minAccuracy;
    if (summary.accuracy >= min) return 0;
    return Math.round(min - summary.accuracy);
  }, [summary.accuracy, activeCampaignRun.minAccuracy]);

  // Total campaign bonus this session
  const totalCampaignBonus = starBonusCoins + firstClearBonus;

  // Total coins earned this session
  const totalCoins = (lastRewards?.brainCoinsEarned ?? 0) +
    (lastRewards?.unlockBonusCoins ?? 0) +
    (lastRewards?.dailyPerfectBonus ?? 0) +
    (lastRewards?.dailyFirstWinBonus ?? 0) +
    totalCampaignBonus;

  const handleNextLevel = useCallback(() => {
    onNextLevel();
  }, [onNextLevel]);

  const handleRetry = useCallback(() => {
    onRetry();
  }, [onRetry]);

  return (
    <div className="space-y-5 pt-4 pb-8 max-w-md mx-auto">
      {/* Pass / Fail Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        {passed ? (
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-sage-600">{t('campaignResult.passed')}</h1>
            {isFirstClear && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="inline-block bg-gradient-to-r from-amber-400 to-amber-500 text-white text-xs px-3 py-1 rounded-full font-medium"
              >
                {t('campaignResult.firstClear')}
              </motion.div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-red-400">{t('campaignResult.failed')}</h1>
            <p className="text-sm text-zen-400">
              {t('campaignResult.failGap', { gap: accuracyGap })}
            </p>
          </div>
        )}
      </motion.div>

      {/* Star Display */}
      <div className="flex justify-center gap-3 py-2">
        {[1, 2, 3].map((i) => (
          <StarIcon key={i} filled={i <= stars} delay={0.2 + i * 0.25} size={56} />
        ))}
      </div>

      {/* New Best indicator */}
      <AnimatePresence>
        {isNewBest && stars > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.0 }}
            className="text-center"
          >
            <span className="inline-block bg-gradient-to-r from-purple-400 to-purple-500 text-white text-xs px-3 py-1 rounded-full font-medium">
              {t('campaignResult.newBestStars', { prev: prevBestStars, now: stars })}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Accuracy & Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow border border-zen-200"
      >
        <div className="text-center mb-4">
          <div className="text-5xl font-light text-zen-700">{Math.round(summary.accuracy)}%</div>
          <div className="text-xs text-zen-400 mt-1">
            {t('campaignResult.passThreshold', { min: activeCampaignRun.minAccuracy })}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-xs border-t border-zen-100 pt-3">
          <div>
            <div className="text-xl font-mono text-green-600">{summary.correctCount}</div>
            <div className="text-zen-400">{t('result.correct')}</div>
          </div>
          <div>
            <div className="text-xl font-mono text-red-500">{summary.incorrectCount}</div>
            <div className="text-zen-400">{t('result.wrong')}</div>
          </div>
          <div>
            <div className="text-xl font-mono text-zen-400">{summary.missedCount}</div>
            <div className="text-zen-400">{t('result.missed')}</div>
          </div>
        </div>
        {summary.avgReactionTimeMs > 0 && (
          <div className="text-center mt-3 pt-3 border-t border-zen-100">
            <span className="text-lg font-mono text-zen-600">{summary.avgReactionTimeMs}</span>
            <span className="text-xs text-zen-400 ml-1">ms {t('result.avgReaction')}</span>
          </div>
        )}
      </motion.div>

      {/* Rewards Breakdown */}
      <AnimatePresence>
        {showRewards && (totalCoins > 0 || (lastRewards?.xpEarned ?? 0) > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow border border-zen-200 space-y-2"
          >
            <div className="text-sm font-medium text-zen-600 mb-2">{t('campaignResult.rewards')}</div>

            {/* XP */}
            {(lastRewards?.xpEarned ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zen-500">{t('campaignResult.xpEarned')}</span>
                <span className="text-purple-600 font-medium">+{lastRewards!.xpEarned} XP</span>
              </div>
            )}

            {/* Base coins */}
            {(lastRewards?.brainCoinsEarned ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zen-500">{t('campaignResult.baseCoins')}</span>
                <span className="text-amber-600 font-medium">+{lastRewards!.brainCoinsEarned} 🪙</span>
              </div>
            )}

            {/* Star bonus */}
            {starBonusCoins > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zen-500">{t('campaignResult.starBonus')}</span>
                <span className="text-amber-600 font-medium">+{starBonusCoins} 🪙</span>
              </div>
            )}

            {/* First clear bonus */}
            {firstClearBonus > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zen-500">{t('campaignResult.firstClearBonus')}</span>
                <span className="text-amber-600 font-medium">+{firstClearBonus} 🪙</span>
              </div>
            )}

            {/* Daily bonuses */}
            {(lastRewards?.dailyFirstWinBonus ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zen-500">{t('campaignResult.dailyFirstWin')}</span>
                <span className="text-amber-600 font-medium">+{lastRewards!.dailyFirstWinBonus} 🪙</span>
              </div>
            )}
            {(lastRewards?.dailyPerfectBonus ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zen-500">{t('campaignResult.dailyPerfect')}</span>
                <span className="text-amber-600 font-medium">+{lastRewards!.dailyPerfectBonus} 🪙</span>
              </div>
            )}

            {/* Unlock bonus */}
            {(lastRewards?.unlockBonusCoins ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zen-500">{t('campaignResult.unlockBonus')}</span>
                <span className="text-amber-600 font-medium">+{lastRewards!.unlockBonusCoins} 🪙</span>
              </div>
            )}

            {/* Total */}
            {totalCoins > 0 && (
              <div className="flex justify-between text-sm font-semibold pt-2 border-t border-zen-100">
                <span className="text-zen-700">{t('campaignResult.totalCoins')}</span>
                <span className="text-amber-600">+{totalCoins} 🪙</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Star upgrade hint */}
      {passed && stars < 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center text-xs text-zen-400"
        >
          {stars === 1 && t('campaignResult.hintTo2Star', { target: 80 })}
          {stars === 2 && t('campaignResult.hintTo3Star', { target: 90 })}
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="space-y-3 pt-2"
      >
        {/* Primary: Next Level (if passed and has next) */}
        {hasNextLevel && (
          <button
            onClick={handleNextLevel}
            className="w-full py-3.5 rounded-xl bg-sage-500 text-white font-medium hover:bg-sage-600 active:scale-[0.98] transition-all shadow-sm"
          >
            {t('campaignResult.nextLevel')}
          </button>
        )}

        {/* Secondary: Retry (always available, styled differently based on context) */}
        <button
          onClick={handleRetry}
          className={`w-full py-3 rounded-xl font-medium transition-all active:scale-[0.98] ${
            !passed
              ? 'bg-sage-500 text-white hover:bg-sage-600 shadow-sm'
              : stars < 3
                ? 'bg-white border-2 border-sage-300 text-sage-600 hover:bg-sage-50'
                : 'bg-white border border-zen-200 text-zen-500 hover:bg-zen-50'
          }`}
        >
          {!passed
            ? t('campaignResult.retryFailed')
            : stars < 3
              ? t('campaignResult.retryForStars')
              : t('campaignResult.playAgain')}
        </button>

        {/* Tertiary: Back to Map */}
        <button
          onClick={onBackToMap}
          className="w-full py-2.5 text-sm text-zen-400 hover:text-zen-600 transition-colors"
        >
          {t('campaignResult.backToMap')}
        </button>
      </motion.div>
    </div>
  );
}
