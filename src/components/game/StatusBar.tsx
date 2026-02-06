interface StatusBarProps {
  onQuit: () => void;
  onPauseToggle: () => void;
  isPaused: boolean;
  currentRound: number;
  totalRounds: number;
  nLevel: number;
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
}: StatusBarProps) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onQuit}
        className="text-sm text-zen-400 hover:text-zen-600 transition"
      >
        ← 退出
      </button>
      <span className="text-xs font-mono text-zen-400">
        {nLevel}-Back · 第 {currentRound}/{totalRounds} 题
      </span>
      <button
        onClick={onPauseToggle}
        className="text-sm text-zen-400 hover:text-zen-600 transition"
      >
        {isPaused ? '▶ 继续' : '⏸ 暂停'}
      </button>
    </div>
  );
}
