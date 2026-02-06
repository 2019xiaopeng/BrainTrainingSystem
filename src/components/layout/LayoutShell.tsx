import type { ReactNode } from 'react';

interface LayoutShellProps {
  children: ReactNode;
  variant?: 'home' | 'game' | 'result';
}

/**
 * LayoutShell - 主容器布局
 * 提供统一的 Zen 美学背景和内容区域
 */
export function LayoutShell({ children, variant = 'home' }: LayoutShellProps) {
  const bgClass =
    variant === 'game'
      ? 'bg-gradient-to-br from-zen-50 via-sage-50 to-dust-50'
      : variant === 'result'
      ? 'bg-gradient-to-br from-zen-50 via-sage-50 to-dust-50'
      : 'bg-zen-50';

  return (
    <div className={`min-h-screen ${bgClass} text-zen-800 p-6 transition-colors duration-500`}>
      <div className="max-w-lg mx-auto animate-fade-in">
        {children}
      </div>
    </div>
  );
}
