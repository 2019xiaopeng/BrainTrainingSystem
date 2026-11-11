// ============================================================
// Brain Flow - Color Perception (色觉挑战) Game Screen
// ============================================================
//
// Self-contained: owns the engine lifecycle (starts on mount), shows
// its own game-over panel — it never navigates to /result.

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { phaseMotion, ScoreReveal, PBPill } from '../game/arcade';
import { useColorPerceptionGame } from '../../hooks/useColorPerceptionGame';

export function ColorPerceptionGameScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const engine = useColorPerceptionGame();
  const { phase, level, current, wrongFlash, finalLevel, best, isNewBest, start, tap } = engine;
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      start();
    }
  }, [start]);

  const cells = Array.from({ length: current.gridSize * current.gridSize }, (_, i) => i);

  return (
    <div className="w-full max-w-md mx-auto px-4 pt-8 pb-10 space-y-6 animate-fade-in">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-light text-zen-700">{t('game.colorPerception.title')}</h1>
        <PBPill best={best} isNewBest={isNewBest} label={t('game.colorPerception.personalBest')} />
      </header>

      <AnimatePresence mode="wait">
        {phase === 'playing' && (
          <motion.section key={`play-${level}`} {...phaseMotion} className="space-y-4">
            <div className="flex items-center justify-between font-mono text-xs text-zen-500">
              <span>{t('game.colorPerception.level')} <b className="text-zen-900 text-base">{level}</b></span>
              <span>{t('game.colorPerception.grid')} {current.gridSize}×{current.gridSize}</span>
            </div>
            <div
              className={`grid gap-1.5 rounded-2xl p-2 border-2 ${wrongFlash ? 'border-rose-400' : 'border-zen-200'}`}
              style={{ gridTemplateColumns: `repeat(${current.gridSize}, minmax(0, 1fr))` }}
            >
              {cells.map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={String(i + 1)}
                  onClick={() => tap(i)}
                  className="aspect-square rounded-lg active:scale-95 transition-transform"
                  style={{ backgroundColor: i === current.oddIndex ? current.oddColor : current.baseColor }}
                />
              ))}
            </div>
            <p className="text-center text-sm text-zen-400">{t('game.colorPerception.prompt')}</p>
          </motion.section>
        )}

        {phase === 'finished' && (
          <motion.section key="finished" {...phaseMotion}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zen-200 shadow-sm py-10 px-4 text-center space-y-4">
            <div className="text-sm text-zen-400">{t('game.colorPerception.gameOver')}</div>
            <ScoreReveal value={finalLevel} tone={isNewBest ? 'best' : 'normal'} />
            <div className="text-xs text-zen-400">{t('game.colorPerception.levelsCleared')}</div>
            {isNewBest && (
              <div className="inline-block px-4 py-1 rounded-full bg-sage-100 border border-sage-200 text-sage-700 text-sm">
                ★ {t('game.colorPerception.personalBest')} {best}
              </div>
            )}
            <div className="flex gap-3 pt-2 justify-center">
              <button
                autoFocus
                onClick={start}
                className="px-8 py-3 rounded-xl bg-sage-500 text-white font-medium
                  hover:bg-sage-600 active:scale-95 transition-all"
              >
                {t('game.colorPerception.again')}
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
