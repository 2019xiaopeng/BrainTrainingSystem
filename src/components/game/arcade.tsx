import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/**
 * Shared arcade animation vocabulary — the standard for all arcade games
 * (see docs/animation-review-2026-11-10.md consistency matrix).
 * New games must use these instead of inventing per-screen motion.
 */

/** Phase-swap motion; spread onto <motion.div key={phaseKey} {...phaseMotion}> inside <AnimatePresence mode="wait">. */
export const phaseMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.25 },
};

/** Big result number reveal (game-over score / average / final length). */
export function ScoreReveal({
  value,
  tone = 'normal',
}: {
  value: string | number;
  tone?: 'normal' | 'best';
}) {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className={`font-mono font-semibold leading-none ${
        tone === 'best' ? 'text-sage-600' : 'text-zen-700'
      }`}
      style={{ fontSize: 'clamp(3.5rem, 18vw, 5.5rem)' }}
    >
      {value}
    </motion.div>
  );
}

/** Personal-best pill (highlights when the run just set a new best). */
export function PBPill({ best, isNewBest, label }: { best: number; isNewBest: boolean; label: string }) {
  return (
    <div
      className={`px-3 py-1 rounded-full text-xs transition-colors ${
        isNewBest
          ? 'bg-sage-200 text-sage-700 font-semibold shadow-sm'
          : 'bg-zen-100 text-zen-500'
      }`}
    >
      {label}
      <span className="font-mono font-semibold ml-1">{best}</span>
    </div>
  );
}

/** Shared timed-run progress bar (sage, compositor-only scaleX). */
export function ProgressBar({ remainingMs, durationMs }: { remainingMs: number; durationMs: number }) {
  const { t } = useTranslation();
  const pct = durationMs > 0 ? Math.max(0, Math.min(100, (remainingMs / durationMs) * 100)) : 0;
  return (
    <div
      className="h-1.5 bg-zen-100 rounded-full overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.ceil(remainingMs / 1000)}
      aria-valuemin={0}
      aria-valuemax={Math.ceil(durationMs / 1000)}
      aria-label={t('game.stroop.timeLeft')}
    >
      <div
        className="h-full bg-sage-400 rounded-full origin-left transition-transform duration-200"
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </div>
  );
}
