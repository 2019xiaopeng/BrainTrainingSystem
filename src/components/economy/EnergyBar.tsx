import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { getNextRecoveryMs } from '../../types/game';
import { Zap } from 'lucide-react';

/**
 * EnergyBar — 体力槽组件
 * 显示当前体力值 + 恢复倒计时
 * 利用 Zustand selector 实现精准更新，无需刷新整个页面
 */
export function EnergyBar() {
  const { t } = useTranslation();

  // Zustand selector: 只订阅 energy 字段，其他字段变化不会触发重渲染
  const energy = useGameStore((s) => s.userProfile.energy);
  const recalculateEnergy = useGameStore((s) => s.recalculateEnergy);

  const [countdown, setCountdown] = useState('');

  // Recalculate energy on mount
  useEffect(() => {
    recalculateEnergy();
  }, [recalculateEnergy]);

  // Countdown timer for next recovery
  const updateCountdown = useCallback(() => {
    if (energy.current >= energy.max) {
      setCountdown('');
      return;
    }
    const remainMs = getNextRecoveryMs(energy);
    const hours = Math.floor(remainMs / 3600000);
    const mins = Math.floor((remainMs % 3600000) / 60000);
    const secs = Math.floor((remainMs % 60000) / 1000);
    setCountdown(
      `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    );
  }, [energy]);

  useEffect(() => {
    updateCountdown();
    if (energy.current >= energy.max) return;
    const timer = setInterval(() => {
      updateCountdown();
      // Check if we should recalculate
      const remainMs = getNextRecoveryMs(energy);
      if (remainMs <= 1000) {
        recalculateEnergy();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [energy, updateCountdown, recalculateEnergy]);

  const energyPercent = (energy.current / energy.max) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <Zap className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-bold text-zen-700">
          {energy.current}/{energy.max}
        </span>
      </div>

      {/* Mini energy bar */}
      <div className="flex-1 h-2 bg-zen-100 rounded-full overflow-hidden min-w-[60px]">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${energyPercent}%`,
            background: energyPercent > 60
              ? 'linear-gradient(90deg, #95a795, #627361)'
              : energyPercent > 20
              ? 'linear-gradient(90deg, #d4a574, #b8864a)'
              : 'linear-gradient(90deg, #e87461, #c44d3c)',
          }}
        />
      </div>

      {/* Recovery countdown */}
      {countdown && (
        <span className="text-[10px] text-zen-400 font-mono whitespace-nowrap">
          +1 {t('energy.in')} {countdown}
        </span>
      )}
    </div>
  );
}
