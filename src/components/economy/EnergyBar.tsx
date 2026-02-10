import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getNextRecoveryMs } from '../../types/game';
import { useTranslation } from 'react-i18next';
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
  const [remainMs, setRemainMs] = useState(() => getNextRecoveryMs(energy));

  // Recalculate energy on mount
  useEffect(() => {
    recalculateEnergy();
  }, [recalculateEnergy]);

  // Periodic energy check (only update internal store, no countdown display)
  useEffect(() => {
    if (energy.current >= energy.max) return;
    const timer = setInterval(() => {
      const remainMs = getNextRecoveryMs(energy);
      setRemainMs(remainMs);
      if (remainMs <= 1000) {
        recalculateEnergy();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [energy, recalculateEnergy]);

  useEffect(() => {
    setRemainMs(getNextRecoveryMs(energy));
  }, [energy]);

  const remainText = useMemo(() => {
    if (energy.current >= energy.max) return null;
    const totalSeconds = Math.max(0, Math.floor(remainMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const time =
      hours > 0
        ? `${hours}${t('time.h')}`
        : minutes > 0
          ? `${minutes}${t('time.m')}`
          : `${Math.max(1, seconds)}${t('time.s')}`;
    return t('energy.recoverIn', { time });
  }, [energy.current, energy.max, remainMs, t]);

  const energyPercent = (energy.current / energy.max) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-zen-700">
            {energy.current}/{energy.max}
          </span>
        </div>

        <div className="flex-1 min-w-[60px]">
          <div className="h-2 bg-zen-100 rounded-full overflow-hidden">
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
        </div>
      </div>

      {remainText && (
        <div className="text-[11px] text-zen-400 leading-none pl-[22px]">
          {remainText}
        </div>
      )}
    </div>
  );
}
