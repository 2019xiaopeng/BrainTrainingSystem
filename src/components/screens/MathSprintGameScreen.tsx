// ============================================================
// Brain Flow - Math Sprint (口算冲刺) Game Screen
// ============================================================
//
// Self-contained like NumberMemoryGameScreen: owns the engine
// lifecycle (starts on mount), renders the phases, and shows its
// own time-up panel — it never navigates to /result.

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useMathSprintGame } from '../../hooks/useMathSprintGame';
import { useGameStore } from '../../store/gameStore';
import { NumericKeypad } from '../game/NumericKeypad';

const phaseMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.25 },
};

export function MathSprintGameScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const durationSec = useGameStore((s) => s.gameConfigs.mathSprint.durationSec);
  const {
    phase, question, input, solved, attempts, timeLeftMs, durationMs,
    best, isNewBest, wrongFlash,
    startGame, retry, inputDigit, backspace, submit,
  } = useMathSprintGame();
  const startedRef = useRef(false);

  // Start once on mount (config is already in the store by the time we get here)
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startGame(durationSec);
  }, [startGame, durationSec]);

  // Physical keyboard alternative to the on-screen keypad
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) inputDigit(e.key);
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Enter') submit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, inputDigit, backspace, submit]);

  const progress = durationMs > 0 ? Math.max(0, Math.min(1, timeLeftMs / durationMs)) : 0;
  const secondsLeft = Math.ceil(timeLeftMs / 1000);
  const accuracy = attempts > 0 ? Math.round((solved / attempts) * 100) : 0;

  return (
    <div className="w-full max-w-md mx-auto px-4 pt-8 pb-10 space-y-6 animate-fade-in">
      {/* Header: quit + title + personal best */}
      <header className="flex items-center justify-between gap-2">
        <button
          onClick={() => navigate('/', { replace: true })}
          className="px-3 py-1.5 rounded-xl bg-zen-100 text-zen-500 text-sm
                     hover:bg-zen-200 active:scale-95 transition-all"
        >
          {t('game.quit')}
        </button>
        <h1 className="text-xl font-light text-zen-700">{t('game.mathSprint.title')}</h1>
        <div
          className={`px-3 py-1 rounded-full text-xs transition-colors ${
            isNewBest
              ? 'bg-sage-200 text-sage-700 font-semibold shadow-sm'
              : 'bg-zen-100 text-zen-500'
          }`}
        >
          {t('game.mathSprint.personalBest')}
          <span className="font-mono font-semibold ml-1">{best}</span>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* Phase: sprint */}
        {phase === 'playing' && (
          <motion.section key="playing" {...phaseMotion} className="space-y-5">
            {/* Countdown + solved counter */}
            <div className="flex items-end justify-between px-1">
              <div>
                <div className="text-xs text-zen-400">{t('game.mathSprint.timeLeft')}</div>
                <div className="font-mono text-3xl font-semibold text-zen-700 tabular-nums">
                  {secondsLeft}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zen-400">{t('game.mathSprint.solved')}</div>
                <div className="font-mono text-3xl font-semibold text-sage-600 tabular-nums">
                  {solved}
                </div>
              </div>
            </div>

            {/* Thin time progress bar (drains left → right) */}
            <div className="h-1 rounded-full bg-zen-100 overflow-hidden">
              <div
                className="h-full bg-sage-400 origin-left transition-transform duration-300 ease-linear"
                style={{ transform: `scaleX(${progress})` }}
              />
            </div>

            {/* Equation */}
            <div
              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zen-200 shadow-sm
                         py-14 sm:py-16 text-center"
            >
              <motion.div
                key={question?.index}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="font-mono font-semibold text-zen-700 tracking-wide text-5xl sm:text-6xl"
              >
                {question ? `${question.a} ${question.op} ${question.b} = ?` : ''}
              </motion.div>
            </div>

            {/* Keypad: shake + red ring on a wrong submit */}
            <motion.div
              animate={wrongFlash ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
              className={wrongFlash ? 'rounded-2xl ring-2 ring-red-300' : ''}
            >
              <NumericKeypad
                value={input}
                onInput={inputDigit}
                onBackspace={backspace}
                onSubmit={submit}
                canInput
              />
            </motion.div>
          </motion.section>
        )}

        {/* Phase: time-up summary */}
        {phase === 'finished' && (
          <motion.section
            key="finished"
            {...phaseMotion}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zen-200 shadow-sm
                       py-12 px-4 text-center space-y-5"
          >
            <div className="text-sm text-zen-400">{t('game.mathSprint.finished')}</div>
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className={`font-mono font-semibold leading-none ${isNewBest ? 'text-sage-600' : 'text-zen-700'}`}
              style={{ fontSize: 'clamp(4rem, 20vw, 6rem)' }}
            >
              {solved}
            </motion.div>
            <div className="text-xs text-zen-400">{t('game.mathSprint.solved')}</div>
            <div className="font-mono text-sm text-zen-500">
              {solved} / {attempts} · {accuracy}%
            </div>
            {isNewBest && (
              <div className="inline-block px-4 py-1 rounded-full bg-sage-100 border border-sage-200 text-sage-700 text-sm">
                ★ {t('game.mathSprint.personalBest')} {best}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={retry}
                className="flex-1 py-3 rounded-xl bg-sage-500 text-white text-sm font-medium
                           hover:bg-sage-600 active:scale-95 transition-all"
              >
                {t('game.mathSprint.again')}
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
