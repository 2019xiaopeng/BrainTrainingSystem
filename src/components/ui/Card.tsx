import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Optional click handler for interactive cards */
  onClick?: () => void;
  /** Padding size */
  padding?: 'sm' | 'md' | 'lg';
}

/**
 * Card — 基础可复用卡片组件
 * 莫兰迪 Zen 风格，统一边框和阴影
 */
export function Card({ children, className, onClick, padding = 'md' }: CardProps) {
  const paddingClass = {
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  }[padding];

  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-sm border border-zen-200/50',
        paddingClass,
        onClick && 'cursor-pointer hover:shadow-md hover:border-zen-300/50 active:scale-[0.99] transition-all',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
