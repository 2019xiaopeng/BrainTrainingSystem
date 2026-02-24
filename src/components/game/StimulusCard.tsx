import { useTranslation } from 'react-i18next';
import type { NumericStimulus } from '../../types/game';

interface StimulusCardProps {
  stimulus: NumericStimulus | null;
  isPaused: boolean;
  isWarmup: boolean;
}

/**
 * StimulusCard - 算式显示卡片（Numeric Mode）
 * 展示当前算式，带入场动画
 */
export function StimulusCard({ stimulus, isPaused, isWarmup }: StimulusCardProps) {
  const { t } = useTranslation();

  if (isPaused) {
    return (
      <div className="flex items-center justify-center h-64 bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-zen-200">
        <span className="text-2xl text-zen-400">{t('game.paused')}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex flex-col items-center justify-center h-64 bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border-2 border-sage-200">
        <div
          key={stimulus?.index}
          className="text-7xl font-light text-zen-700 font-mono animate-slide-up"
        >
          {stimulus?.equation ?? '—'}
        </div>
        {isWarmup && (
          <div className="absolute bottom-6 text-sm text-sage-600 bg-sage-50 px-4 py-2 rounded-full animate-fade-in">
            {t('game.warmupHint')}
          </div>
        )}
      </div>
    </div>
  );
}
