// ============================================================
// Brain Flow - Hippocampus Test (海马体测试) Game Screen
// ============================================================
//
// Self-contained: numbers flash at random positions, hide, and you
// tap them in ascending order. Owns its lifecycle + summary panel.

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { phaseMotion, ScoreReveal, PBPill } from '../game/arcade';
import { useHippocampusGame } from '../../hooks/useHippocampusGame';

export function HippocampusGameScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const engine = useHippocampusGame();
  const {
    phase, level, current, nextToTap, lastRevealed, wrongCell, strikes,
    finalLevel, best, isNewBest, gridSize, maxStrikes, start, tapCell,
  } = engine;
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      start();
    }
  }, [start]);

  const cells = Array.from({ length: gridSize * gridSize }, (_, i) => i);
  const phaseText =
    phase === 'showing' ? t('game.hippocampus.memorize')
    : phase === 'recall' ? t('game.hippocampus.recall', { next: nextToTap })
    : phase === 'feedback' ? t('game.hippocampus.levelClear')
    : '';

  return (
    <div className="w-full max-w-md mx-auto px-4 pt-8 pb-10 space-y-6 animate-fade-in">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-light text-zen-700">{t('game.hippocampus.title')}</h1>
        <PBPill best={best} isNewBest={isNewBest} label={t('game.hippocampus.personalBest')} />
      </header>

      <AnimatePresence mode="wait">
        {phase !== 'finished' && (
          <motion.section key={`play-${level}-${phase}`} {...phaseMotion} className="space-y-4">
            <div className="flex items-center justify-between font-mono text-xs text-zen-500">
              <span>{t('game.hippocampus.level')} <b className="text-zen-900 text-base">{level}</b></span>
              <span>{'✕'.repeat(strikes)}{'·'.repeat(maxStrikes - strikes)}</span>
            </div>
            <div
              className="grid gap-1.5 rounded-2xl p-2 border-2 border-zen-200"
              style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
            >
              {cells.map((i) => {
                const value = current.cells[i];
                const revealed = lastRevealed === i;
                const isWrong = wrongCell === i;
                const showNumber = (phase === 'showing' && value !== null) || revealed;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={String(i + 1)}
                    disabled={phase !== 'recall'}
                    onClick={() => tapCell(i)}
                    className={`aspect-square rounded-lg border-2 flex items-center justify-center
                      font-mono font-bold text-lg sm:text-xl transition-colors duration-150
                      ${isWrong ? 'bg-rose-100 border-rose-400 text-rose-600'
                        : showNumber ? 'bg-sage-200 border-sage-400 text-sage-900'
                        : 'bg-zen-100 border-zen-200 text-transparent'}`}
                  >
                    {value ?? '·'}
                  </button>
                );
              })}
            </div>
            <p className="text-center text-sm text-zen-400 min-h-[1.5em]">{phaseText}</p>
          </motion.section>
        )}

        {phase === 'finished' && (
          <motion.section key="finished" {...phaseMotion}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zen-200 shadow-sm py-10 px-4 text-center space-y-4">
            <div className="text-sm text-zen-400">{t('game.hippocampus.gameOver')}</div>
            <ScoreReveal value={finalLevel} tone={isNewBest ? 'best' : 'normal'} />
            <div className="text-xs text-zen-400">{t('game.hippocampus.levelsCleared')}</div>
            {isNewBest && (
              <div className="inline-block px-4 py-1 rounded-full bg-sage-100 border border-sage-200 text-sage-700 text-sm">
                ★ {t('game.hippocampus.personalBest')} {best}
              </div>
            )}
            <div className="flex gap-3 pt-2 justify-center">
              <button
                autoFocus
                onClick={start}
                className="px-8 py-3 rounded-xl bg-sage-500 text-white font-medium
                  hover:bg-sage-600 active:scale-95 transition-all"
              >
                {t('game.hippocampus.again')}
              </button>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="px-8 py-3 rounded-xl bg-zen-100 text-zen-600 font-medium
                  hover:bg-zen-200 active:scale-95 transition-all"
              >
                {t('game.quit')}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
