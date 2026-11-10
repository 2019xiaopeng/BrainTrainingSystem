// ============================================================
// Brain Flow - Sequence Memory (顺序记忆) Game Screen
// ============================================================
//
// Self-contained: owns the engine lifecycle (starts on mount),
// shows the phases over a persistent grid, and renders its own
// game-over panel — it never navigates to /result.

import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useSequenceMemoryGame } from '../../hooks/useSequenceMemoryGame';
import { useGameStore } from '../../store/gameStore';
import { phaseMotion, ScoreReveal, PBPill } from '../game/arcade';

export function SequenceMemoryGameScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const gridSize = useGameStore((s) => s.gameConfigs.sequence.gridSize);
  const size = Math.max(3, Math.min(5, Math.round(gridSize)));
  const {
    phase, sequence, lit, inputIdx, best, isNewBest, finalLength, wrongCell,
    startGame, retry, pressCell,
  } = useSequenceMemoryGame();
  const startedRef = useRef(false);

  // Start once on mount (config is already in the store by the time we get here).
  // startGame is a stable useCallback, so the startedRef guard keeps this once-only.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startGame(size);
  }, [startGame, size]);

  const cells = useMemo(
    () => Array.from({ length: size * size }, (_, i) => i),
    [size],
  );

  const inRun = phase === 'showing' || phase === 'input' || phase === 'feedback';
  // On game over: reveal which step failed — the wrong cell in red,
  // the cell that should have been next in sage.
  const expectedCell = phase === 'finished' ? (sequence[inputIdx] ?? -1) : -1;

  const cellClass = (i: number): string => {
    const base =
      'aspect-square rounded-xl border transition-all duration-150 select-none';
    if (i === lit)
      return `${base} bg-sage-300 border-sage-400 shadow-sm scale-[1.04]`;
    if (phase === 'finished' && i === wrongCell)
      return `${base} bg-rose-200 border-rose-300`;
    if (phase === 'finished' && i === expectedCell)
      return `${base} bg-sage-200 border-sage-300`;
    if (phase === 'input')
      return `${base} bg-zen-100 border-zen-200 hover:bg-zen-200/70 active:scale-95 cursor-pointer`;
    return `${base} bg-zen-100 border-zen-200`;
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 pt-8 pb-10 space-y-6 animate-fade-in">
      {/* Header: title + in-run quit + personal best */}
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-light text-zen-700">{t('game.sequence.title')}</h1>
        <div className="flex items-center gap-3">
          {inRun && (
            <button
              onClick={() => navigate('/', { replace: true })}
              className="text-xs text-zen-400 hover:text-zen-600 transition-colors"
            >
              {t('game.quit')}
            </button>
          )}
          <PBPill best={best} isNewBest={isNewBest} label={t('game.sequence.personalBest')} />
        </div>
      </header>

      {/* Phase status */}
      <div className="min-h-12 text-center space-y-1">
        <AnimatePresence mode="wait">
          {phase === 'showing' && (
            <motion.div key="showing" {...phaseMotion}>
              <div className="text-xs text-zen-400">
                {t('game.sequence.level')} · <span className="font-mono">{sequence.length}</span>
              </div>
              <div className="text-sm text-zen-500">{t('game.sequence.watch')}</div>
            </motion.div>
          )}

          {phase === 'input' && (
            <motion.div key="input" {...phaseMotion}>
              <div className="text-xs text-zen-400">
                {t('game.sequence.level')} ·{' '}
                <span className="font-mono">
                  {inputIdx} / {sequence.length}
                </span>
              </div>
              <div className="text-sm text-zen-500">{t('game.sequence.repeat')}</div>
            </motion.div>
          )}

          {phase === 'feedback' && (
            <motion.div key="feedback" {...phaseMotion} className="pt-2">
              <div className="text-sm font-medium text-sage-600">
                🌿 {t('game.sequence.correct')}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grid (persistent: flash, picks and the failed-step reveal all live here) */}
      <div
        className="grid gap-2 sm:gap-3 mx-auto w-full max-w-xs sm:max-w-sm"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {cells.map((i) => (
          <button
            key={i}
            type="button"
            aria-label={String(i + 1)}
            disabled={phase !== 'input'}
            onClick={() => pressCell(i)}
            className={cellClass(i)}
          />
        ))}
      </div>

      {/* Game over panel */}
      <AnimatePresence>
        {phase === 'finished' && (
          <motion.section
            key="finished"
            {...phaseMotion}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zen-200 shadow-sm
                       py-8 px-4 text-center space-y-4"
          >
            <div className="text-sm text-zen-400">{t('game.sequence.gameOver')}</div>
            <ScoreReveal value={finalLength} tone={isNewBest ? 'best' : 'normal'} />
            {isNewBest && (
              <div className="inline-block px-4 py-1 rounded-full bg-sage-100 border border-sage-200 text-sage-700 text-sm">
                ★ {t('game.sequence.personalBest')} {best}
              </div>
            )}
            <div className="text-sm text-red-400">{t('game.sequence.wrong')}</div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={retry}
                className="flex-1 py-3 rounded-xl bg-sage-500 text-white text-sm font-medium
                           hover:bg-sage-600 active:scale-95 transition-all"
              autoFocus
              >
                {t('game.sequence.again')}
              </button>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="flex-1 py-3 rounded-xl bg-zen-100 text-zen-600 text-sm font-medium
                           hover:bg-zen-200 active:scale-95 transition-all"
              >
                {t('result.backHome')}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
