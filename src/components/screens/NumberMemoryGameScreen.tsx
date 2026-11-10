// ============================================================
// Brain Flow - Number Memory (数字记忆) Game Screen
// ============================================================
//
// Self-contained: owns the engine lifecycle (starts on mount),
// shows the phases, and renders its own game-over panel —
// it never navigates to /result.

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useNumberMemoryGame } from '../../hooks/useNumberMemoryGame';
import { useGameStore } from '../../store/gameStore';
import { NumericKeypad } from '../game/NumericKeypad';
import { phaseMotion, ScoreReveal, PBPill } from '../game/arcade';

/** Digits get smaller as the string grows so long spans still fit one line */
function digitSizeClass(length: number): string {
  if (length <= 5) return 'text-7xl sm:text-8xl';
  if (length <= 8) return 'text-6xl sm:text-7xl';
  if (length <= 12) return 'text-5xl sm:text-6xl';
  return 'text-4xl sm:text-5xl';
}

export function NumberMemoryGameScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const startDigits = useGameStore((s) => s.gameConfigs.numberMemory.startDigits);
  const {
    phase, digits, input, best, isNewBest, finalLength,
    startGame, retry, inputDigit, backspace, submit,
  } = useNumberMemoryGame();
  const startedRef = useRef(false);

  // Start once on mount (config is already in the store by the time we get here).
  // startGame is a stable useCallback, so the startedRef guard keeps this once-only.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startGame(startDigits);
  }, [startGame, startDigits]);

  // Physical keyboard alternative to the on-screen keypad
  useEffect(() => {
    if (phase !== 'input') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) inputDigit(e.key);
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Enter') submit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, inputDigit, backspace, submit]);

  return (
    <div className="w-full max-w-md mx-auto px-4 pt-8 pb-10 space-y-6 animate-fade-in">
      {/* Header: title + personal best */}
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-light text-zen-700">{t('game.numberMemory.title')}</h1>
        <div className="flex items-center gap-3">
          {phase !== 'finished' && phase !== 'idle' && (
            <button
              onClick={() => navigate('/', { replace: true })}
              className="text-xs text-zen-400 hover:text-zen-600 transition-colors"
            >
              {t('game.quit')}
            </button>
          )}
          <PBPill best={best} isNewBest={isNewBest} label={t('game.numberMemory.personalBest')} />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* Phase: memorize */}
        {phase === 'showing' && (
          <motion.section
            key="showing"
            {...phaseMotion}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zen-200 shadow-sm
                       py-14 sm:py-20 text-center space-y-6"
          >
            <div className="text-xs text-zen-400">
              {t('game.numberMemory.level')} · <span className="font-mono">{digits.length}</span>
            </div>
            <div className="text-sm text-zen-500">{t('game.numberMemory.memorize')}</div>
            <motion.div
              key={digits}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`font-mono font-semibold text-zen-700 tracking-wider break-all px-4 ${digitSizeClass(
                digits.length,
              )}`}
            >
              {digits}
            </motion.div>
          </motion.section>
        )}

        {/* Phase: type it back */}
        {phase === 'input' && (
          <motion.section key="input" {...phaseMotion} className="space-y-5">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zen-200 shadow-sm py-8 text-center space-y-5">
              <div className="text-sm text-zen-500">{t('game.numberMemory.input')}</div>
              <div className="min-h-14 flex flex-wrap justify-center items-center gap-1.5 px-4">
                {input === '' ? (
                  <span className="font-mono text-2xl text-zen-300">…</span>
                ) : (
                  input.split('').map((d, i) => (
                    <span
                      key={i}
                      className="w-9 h-12 rounded-lg bg-zen-100 border border-zen-200
                                 font-mono text-2xl text-zen-700 flex items-center justify-center"
                    >
                      {d}
                    </span>
                  ))
                )}
              </div>
            </div>
            <NumericKeypad
              value={input}
              onInput={inputDigit}
              onBackspace={backspace}
              onSubmit={submit}
              canInput
            />
          </motion.section>
        )}

        {/* Phase: correct cue */}
        {phase === 'feedback' && (
          <motion.section
            key="feedback"
            {...phaseMotion}
            className="bg-sage-50 rounded-2xl border border-sage-200 shadow-sm
                       py-14 sm:py-20 text-center space-y-4"
          >
            <div className="text-5xl">🌿</div>
            <div className="text-lg font-light text-sage-700">{t('game.numberMemory.correct')}</div>
          </motion.section>
        )}

        {/* Phase: game over */}
        {phase === 'finished' && (
          <motion.section
            key="finished"
            {...phaseMotion}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zen-200 shadow-sm
                       py-12 px-4 text-center space-y-5"
          >
            <div className="text-sm text-zen-400">{t('game.numberMemory.gameOver')}</div>
            <ScoreReveal value={finalLength} tone={isNewBest ? 'best' : 'normal'} />
            {isNewBest && (
              <div className="inline-block px-4 py-1 rounded-full bg-sage-100 border border-sage-200 text-sage-700 text-sm">
                ★ {t('game.numberMemory.personalBest')} {best}
              </div>
            )}
            <div className="space-y-1">
              <div className="text-sm text-red-400">{t('game.numberMemory.wrong')}</div>
              <div className="font-mono text-sm text-zen-500 break-all">
                {t('game.yourAnswer', { user: input, correct: digits })}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={retry}
                className="flex-1 py-3 rounded-xl bg-sage-500 text-white text-sm font-medium
                           hover:bg-sage-600 active:scale-95 transition-all"
              autoFocus
              >
                {t('game.numberMemory.again')}
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
