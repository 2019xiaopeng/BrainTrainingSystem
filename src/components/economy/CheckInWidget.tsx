import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Flame } from 'lucide-react';

/**
 * CheckInWidget — 每日签到组件
 * 显示签到按钮或已签到状态
 */
export function CheckInWidget() {
  const { t } = useTranslation();
  const checkIn = useGameStore((s) => s.userProfile.checkIn);
  const performCheckIn = useGameStore((s) => s.performCheckIn);
  const [reward, setReward] = useState<{ xp: number; coins: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const isCheckedIn = checkIn.lastCheckInDate === today;

  const handleCheckIn = async () => {
    if (isCheckedIn) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await performCheckIn();
      if (result) {
        setReward({ xp: result.xpGained, coins: result.coinsGained });
        setTimeout(() => setReward(null), 3000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Gift className="w-4 h-4 text-sage-600" />
          <span className="text-sm font-medium text-zen-600 truncate">{t('checkin.title')}</span>
        </div>
        {checkIn.consecutiveDays > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-orange-500 whitespace-nowrap shrink-0">
            <Flame className="w-3 h-3" />
            <span>{t('checkin.streak', { days: checkIn.consecutiveDays })}</span>
          </div>
        )}
      </div>

      {isCheckedIn ? (
        <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-sage-50 border border-sage-200/50">
          <span className="text-sm text-sage-700">{t('checkin.done')}</span>
        </div>
      ) : (
        <button
          onClick={handleCheckIn}
          disabled={submitting}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-sage-400 to-sage-500 text-white text-sm font-medium
                     hover:from-sage-500 hover:to-sage-600 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
        >
          {submitting ? t('checkin.claiming') : t('checkin.claim')}
        </button>
      )}

      {/* Reward animation */}
      <AnimatePresence>
        {reward && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 text-center text-xs text-sage-700 bg-sage-50 rounded-lg py-2 border border-sage-200/50"
          >
            ✨ +{reward.xp} XP · +{reward.coins} {t('checkin.points')}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
