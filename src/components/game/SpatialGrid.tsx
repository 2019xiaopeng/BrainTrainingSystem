import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface SpatialGridProps {
  /** Grid size (3 = 3x3, 4 = 4x4, 5 = 5x5) */
  gridSize: number;
  /** Currently highlighted grid index, or null if none */
  activeIndex: number | null;
  /** Whether the game is paused */
  isPaused: boolean;
  /** Whether in warmup phase (no input allowed) */
  isWarmup: boolean;
  /** Whether stimulus is currently visible (locks input) */
  isStimulusVisible: boolean;
  /** Callback when user clicks a grid cell */
  onCellClick: (index: number) => void;
  /** Index of last clicked cell for visual feedback */
  lastClickedIndex: number | null;
  /** Whether last answer was correct (for feedback color) */
  lastAnswerCorrect: boolean | null;
}

/**
 * SpatialGrid - Dynamic NxN grid for spatial N-Back mode
 * Supports 3x3, 4x4, 5x5 with phase-based input locking
 */
export function SpatialGrid({
  gridSize,
  activeIndex,
  isPaused,
  isWarmup,
  isStimulusVisible,
  onCellClick,
  lastClickedIndex,
  lastAnswerCorrect,
}: SpatialGridProps) {
  const { t } = useTranslation();
  const [feedbackIndex, setFeedbackIndex] = useState<number | null>(null);

  // Show feedback briefly after click
  useEffect(() => {
    if (lastClickedIndex !== null) {
      setFeedbackIndex(lastClickedIndex);
      const timer = setTimeout(() => setFeedbackIndex(null), 300);
      return () => clearTimeout(timer);
    }
  }, [lastClickedIndex]);

  const totalCells = gridSize * gridSize;
  const canInput = !isPaused && !isWarmup && !isStimulusVisible;

  const getCellClassName = (index: number): string => {
    const base = 'aspect-square rounded-lg transition-all duration-200 flex items-center justify-center';
    
    // Paused state
    if (isPaused) {
      return `${base} bg-zen-200 cursor-not-allowed`;
    }
    
    // Active stimulus (being shown) - brighter teal with pulse
    if (activeIndex === index && isStimulusVisible) {
      return `${base} bg-teal-500 shadow-lg scale-105 animate-pulse`;
    }
    
    // Feedback after click
    if (feedbackIndex === index) {
      const feedbackColor = lastAnswerCorrect ? 'bg-green-500' : 'bg-red-500';
      return `${base} ${feedbackColor} shadow-lg scale-105`;
    }
    
    // Input locked (warmup or stimulus visible)
    if (!canInput) {
      return `${base} bg-zen-100 cursor-not-allowed opacity-70`;
    }
    
    // Default clickable state - with visual cue
    return `${base} bg-white border-2 border-zen-200 hover:border-teal-400 hover:bg-teal-50 active:scale-95 cursor-pointer shadow-sm`;
  };

  const gapClass = gridSize >= 4 ? 'gap-2' : 'gap-3';
  const inputBorder = canInput ? 'border-teal-300' : 'border-zen-200';

  // Adjust container size based on grid
  const containerMaxWidth = gridSize === 3 ? 'max-w-sm' : gridSize === 4 ? 'max-w-md' : 'max-w-lg';

  return (
    <div className={`w-full ${containerMaxWidth} mx-auto`}>
      {/* Grid container - 使用内联样式解决动态grid-cols问题 */}
      <div 
        className={`grid ${gapClass} p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 ${inputBorder} transition-all`}
        style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: totalCells }, (_, i) => (
          <button
            key={i}
            className={getCellClassName(i)}
            onClick={() => canInput && onCellClick(i)}
            disabled={!canInput}
            aria-label={`Grid cell ${i + 1}`}
          >
            {/* Optional: Show grid numbers for debugging */}
            {/* <span className="text-zen-400 text-xs font-mono">{i}</span> */}
          </button>
        ))}
      </div>

      {/* Status indicator */}
      <div className="text-center mt-3 text-sm">
        {isWarmup && <span className="text-zen-500">{t('game.noClickNeeded')}</span>}
        {!isWarmup && isStimulusVisible && <span className="text-teal-600">{t('game.observePosition')}</span>}
        {!isWarmup && !isStimulusVisible && !isPaused && (
          <span className="text-green-600 font-medium">{t('game.canClick')}</span>
        )}
      </div>
    </div>
  );
}
