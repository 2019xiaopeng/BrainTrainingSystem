import { useEffect, useState } from 'react';

interface AnswerCountdownProps {
  /** 总时长（毫秒） */
  duration: number;
  /** 当前轮次索引（用于重置计时器） */
  roundIndex: number;
  /** 是否暂停 */
  isPaused: boolean;
}

/**
 * AnswerCountdown - 圆形倒计时组件
 * 显示一个SVG圆环，随时间减少
 */
export function AnswerCountdown({ duration, roundIndex, isPaused }: AnswerCountdownProps) {
  const [progress, setProgress] = useState(1); // 1 = 100%, 0 = 0%

  useEffect(() => {
    if (isPaused) return;

    const startTime = Date.now();
    let rafId: number;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.max(0, 1 - elapsed / duration);
      setProgress(newProgress);

      if (newProgress > 0) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [duration, roundIndex, isPaused]);

  // 重置进度当轮次改变
  useEffect(() => {
    setProgress(1);
  }, [roundIndex]);

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // 颜色根据剩余时间变化
  let strokeColor = '#10b981'; // green
  if (progress < 0.3) strokeColor = '#ef4444'; // red
  else if (progress < 0.6) strokeColor = '#f59e0b'; // amber

  return (
    <div className="relative w-10 h-10">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
        {/* 背景圆 */}
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-zen-200"
        />
        {/* 进度圆 */}
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-100"
        />
      </svg>
      {/* 中心显示剩余秒数 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-zen-700">
          {Math.ceil(progress * (duration / 1000))}
        </span>
      </div>
    </div>
  );
}
