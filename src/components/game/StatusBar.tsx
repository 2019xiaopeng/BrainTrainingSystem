import { useTranslation } from 'react-i18next';

interface StatusBarProps {
  onQuit: () => void;
  onPauseToggle: () => void;
  isPaused: boolean;
  currentRound: number;
  totalRounds: number;
  nLevel: number;
  /** 自定义游戏模式标签，如果提供则覆盖默认的 "N-Back" 格式 */
  gameLabel?: string;
}

/**
 * StatusBar - 游戏顶栏
 * 显示进度、暂停按钮、退出按钮
 */
export function StatusBar({
  onQuit,
  onPauseToggle,
  isPaused,
  currentRound,
  totalRounds,
  nLevel,
  gameLabel,
}: StatusBarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onQuit}
        className="text-sm text-zen-400 hover:text-zen-600 transition"
      >
        {t('game.quit')}
      </button>
      <span className="text-xs font-mono text-zen-400">
        {gameLabel || `${nLevel}-Back`} · {t('game.round', { current: currentRound, total: totalRounds })}
      </span>
      <button
        onClick={onPauseToggle}
        className="text-sm text-zen-400 hover:text-zen-600 transition"
      >
        {isPaused ? t('game.resume') : t('game.pause')}
      </button>
    </div>
  );
}
