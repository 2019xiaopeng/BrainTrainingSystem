import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { getBrainRank, getNextBrainRank } from '../../types/game';
import { Shield, ChevronRight, Zap } from 'lucide-react';

interface BrainRankCardProps {
  totalXP: number;
  /** Completed milestones */
  completedMilestones?: string[];
  /** Compact mode for sidebar */
  compact?: boolean;
}

/** Rank tier gradient colors (Morandi palette) */
const RANK_GRADIENTS: Record<number, string> = {
  1: 'from-zen-300 to-zen-400',
  2: 'from-sage-300 to-sage-500',
  3: 'from-teal-300 to-teal-500',
  4: 'from-blue-300 to-blue-500',
  5: 'from-indigo-300 to-indigo-500',
  6: 'from-amber-300 to-amber-500',
  7: 'from-rose-300 to-rose-500',
};

/**
 * BrainRankCard — 段位展示 + XP 进度条
 */
export function BrainRankCard({ totalXP, completedMilestones = [], compact = false }: BrainRankCardProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  const currentRank = getBrainRank(totalXP, completedMilestones);
  const nextRank = getNextBrainRank(totalXP, completedMilestones);

  const rankTitle = isZh ? currentRank.titleZh : currentRank.titleEn;
  const nextRankTitle = nextRank ? (isZh ? nextRank.titleZh : nextRank.titleEn) : null;

  // Check if user has enough XP for next rank but lacks milestones
  const hasEnoughXP = nextRank ? totalXP >= nextRank.xpRequired : false;
  
  // Logic to determine which milestones are missing
  // If OR logic, show all as options but indicate "One of"
  const missingMilestones = nextRank?.milestones 
    ? nextRank.milestones.filter(m => !completedMilestones.includes(m)) 
    : [];
    
  // If logic is OR, we only need to show missing if NONE are completed
  const isOrLogic = nextRank?.milestoneLogic === 'OR';
  const hasAnyMilestone = isOrLogic 
    ? nextRank?.milestones?.some(m => completedMilestones.includes(m))
    : false;
  
  // If has enough XP, but missing milestones
  // For OR logic: if hasAnyMilestone is false, we need to show options
  // For AND logic: if missingMilestones.length > 0, we show them
  const showMilestoneReq = hasEnoughXP && nextRank && (isOrLogic ? !hasAnyMilestone : missingMilestones.length > 0);

  // XP progress to next level
  const xpInCurrentLevel = totalXP - currentRank.xpRequired;
  const xpNeededForNext = nextRank
    ? nextRank.xpRequired - currentRank.xpRequired
    : 1;
  const progress = nextRank
    ? Math.min(100, (xpInCurrentLevel / xpNeededForNext) * 100)
    : 100;

  const gradient = RANK_GRADIENTS[currentRank.level] || RANK_GRADIENTS[1];

  if (compact) {
    return (
      <div className={`bg-gradient-to-br ${gradient} rounded-xl p-4 text-white shadow-lg`}>
        {/* Rank badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="font-bold text-lg">LV{currentRank.level}</span>
            <span className="text-sm font-medium opacity-90">{rankTitle}</span>
          </div>
          <Zap className="w-4 h-4 opacity-70" />
        </div>

        {/* XP info */}
        <div className="text-xs opacity-80 mb-1.5">
          {totalXP.toLocaleString()} XP
          {nextRank && <span className="ml-1">/ {nextRank.xpRequired.toLocaleString()}</span>}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-white/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </div>

        {/* Next level preview */}
        {nextRank && (
          <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
            {showMilestoneReq ? (
              <div className="flex flex-col gap-0.5 w-full">
                <span className="font-medium">{isOrLogic ? t('profile.oneOf') : t('profile.required')}:</span>
                {missingMilestones.map(m => (
                  <span key={m}>- {t(`instruction.rank.milestone.${m}`)}</span>
                ))}
              </div>
            ) : (
              <>
                <ChevronRight className="w-3 h-3" />
                <span>{t('profile.nextRank', { rank: `LV${nextRank.level} ${nextRankTitle}` })}</span>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full card (Profile page)
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white shadow-xl overflow-hidden relative`}>
      {/* Background decoration */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-white/5 rounded-full blur-xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <div className="text-2xl font-bold">LV{currentRank.level}</div>
              <div className="text-sm opacity-90 font-medium">{rankTitle}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold">{totalXP.toLocaleString()}</div>
            <div className="text-xs opacity-70">XP</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs opacity-80 mb-1">
            <span>LV{currentRank.level} {rankTitle}</span>
            {nextRank && <span>LV{nextRank.level} {nextRankTitle}</span>}
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-white/80 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
          <div className="text-xs opacity-70 mt-1">
            {nextRank ? (
              showMilestoneReq ? (
                <div className="flex flex-col gap-0.5 mt-2 p-2 bg-white/10 rounded-lg">
                  <span className="text-white/90 font-bold mb-1">
                    {isOrLogic ? t('profile.milestoneOneOf') : t('profile.milestoneRequired')}:
                  </span>
                  {missingMilestones.map(m => (
                    <span key={m} className="text-white/80 text-xs flex items-center gap-1">
                      <span className="w-1 h-1 bg-white/50 rounded-full" />
                      {t(`instruction.rank.milestone.${m}`)}
                    </span>
                  ))}
                </div>
              ) : (
                t('profile.xpToNext', { xp: Math.max(0, nextRank.xpRequired - totalXP).toLocaleString() })
              )
            ) : (
              t('profile.maxRank')
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
