// ============================================================
// Brain Flow - Stroop Test (色词冲突) Game Screen
// ============================================================
//
// Self-contained: owns the engine lifecycle (starts on mount, like
// NumberMemoryGameScreen), renders its own time-up summary — it never
// navigates to /result.

import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useStroopGame } from '../../hooks/useStroopGame';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { useGameStore } from '../../store/gameStore';

/** Ink classes for the big word — the thing the player must identify */
const INK_CLASSES = ['text-red-500', 'text-blue-500', 'text-green-500', 'text-yellow-500'];

/** Soft swatches behind the neutral-ink labels (the button itself never
 *  spells its color in its own color — that would invert the challenge) */
const SWATCH_CLASSES = [
  'bg-red-50 border-red-200 hover:border-red-400',
  'bg-blue-50 border-blue-200 hover:border-blue-400',
  'bg-green-50 border-green-200 hover:border-green-400',
  'bg-yellow-50 border-yellow-200 hover:border-yellow-400',
];

// shortcut: color names are game content the locale files don't carry (the
// registration scaffold added no color keys); add locale keys when a third language lands
const COLOR_WORDS: Record<'zh' | 'en', string[]> = {
  zh: ['红', '蓝', '绿', '黄'],
  en: ['Red', 'Blue', 'Green', 'Yellow'],
};

function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function StroopGameScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const durationSec = useGameStore((s) => s.gameConfigs.stroop.durationSec);
  const engine = useStroopGame(durationSec);
  const {
    phase, trial, trialIndex, score, feedback,
    timeLeftMs, totalMs, result, best, start, answer,
  } = engine;
  const { playClick, playWrong, playFinish, playRecord } = useSoundEffects();

  const words =
    COLOR_WORDS[(i18n.resolvedLanguage ?? i18n.language ?? 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en'];

  // Start once on mount (config is already in the store by the time we get here)
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    start();
  }, [start]);

  // Persist the completed run into the global store, exactly once per run
  const savedRef = useRef(result?.session ?? null);
  useEffect(() => {
    const session = result?.session;
    if (session && session !== savedRef.current) {
      savedRef.current = session;
      useGameStore.getState().saveSession(session);
    }
  }, [result]);

  // Time-up sounds (+ record chime on new best)
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (phase === 'finished' && prevPhaseRef.current !== 'finished') {
      playFinish();
      if (result?.isNewBest) playRecord();
    }
    prevPhaseRef.current = phase;
  }, [phase, result, playFinish, playRecord]);

  const handleAnswer = useCallback(
    (index: number) => {
      const outcome = answer(index);
      if (outcome === null) return;
      playClick();
      if (outcome === 'wrong') playWrong();
    },
    [answer, playClick, playWrong],
  );

  // Desktop: keys 1-4 pick the matching answer button
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx !== -1) handleAnswer(idx);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, handleAnswer]);

  const cardTone =
    feedback === 'correct'
      ? 'bg-emerald-50 border-emerald-300'
      : feedback === 'wrong'
        ? 'bg-rose-50 border-rose-300'
        : 'bg-white border-zen-200';

  return (
    <div className="w-full max-w-lg mx-auto px-4 pt-6 pb-10 flex flex-col gap-5 animate-fade-in">
      <h1 className="sr-only">{t('game.stroop.title')}</h1>

      {/* Header: title + personal best */}
      <header className="flex items-center justify-between">
        <div className="text-xl font-light text-zen-700">{t('game.stroop.title')}</div>
        <div
          className={`px-3 py-1 rounded-full text-xs transition-colors ${
            result?.isNewBest
              ? 'bg-amber-100 text-amber-700 border border-amber-300 font-semibold shadow-sm'
              : 'bg-zen-100 text-zen-500'
          }`}
        >
          {t('game.stroop.personalBest')}
          <span className="font-mono font-semibold ml-1">{result?.best ?? best ?? '—'}</span>
        </div>
      </header>

      {phase !== 'finished' && (
        <>
          {/* HUD: score + countdown */}
          <div className="flex items-center justify-between text-sm text-zen-500">
            <span>
              {t('game.stroop.score')}{' '}
              <b className="text-zen-800 text-lg tabular-nums">{score}</b>
            </span>
            <span>
              {t('game.stroop.timeLeft')}{' '}
              <b
                className={`text-lg tabular-nums ${
                  timeLeftMs <= 5000 ? 'text-rose-500' : 'text-zen-800'
                }`}
              >
                {formatClock(timeLeftMs)}
              </b>
            </span>
          </div>

          {/* Progress bar (scaleX compositor animation, doesn't trigger layout) */}
          <div className="w-full h-1.5 bg-zen-200 rounded-full overflow-hidden">
            <div
              className="h-full w-full bg-sage-400 origin-left transition-transform duration-200"
              style={{ transform: `scaleX(${Math.max(0, Math.min(1, timeLeftMs / totalMs))})` }}
            />
          </div>
        </>
      )}

      {/* Trial card: the color word in its ink color */}
      <div className="relative">
        <motion.div
          key={trialIndex}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: feedback === 'wrong' ? [0, -10, 10, -6, 6, 0] : 0,
          }}
          transition={{ duration: 0.3 }}
          className={`h-44 sm:h-52 rounded-3xl border-2 flex items-center justify-center
            shadow-sm select-none transition-colors duration-150 ${cardTone}`}
        >
          <span
            className={`text-6xl sm:text-7xl font-bold tracking-wide ${INK_CLASSES[trial.inkIndex]}`}
          >
            {words[trial.wordIndex]}
          </span>

          {/* feedback glyph: correct must not be color-only (color-blind + muted) */}
          {(feedback === 'correct' || feedback === 'wrong') && (
            <span
              aria-hidden="true"
              className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center
                text-sm font-bold text-white ${feedback === 'correct' ? 'bg-emerald-500' : 'bg-rose-500'}`}
            >
              {feedback === 'correct' ? '✓' : '✗'}
            </span>
          )}
        </motion.div>

        {phase === 'playing' && (
          <button
            onClick={() => navigate('/', { replace: true })}
            className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-white/60 text-sm text-zen-600
              hover:bg-white/90 active:scale-95 transition-all"
          >
            {t('game.quit')}
          </button>
        )}
      </div>

      {phase === 'playing' && (
        <>
          <p className="text-center text-sm text-zen-400">{t('game.stroop.prompt')}</p>

          {/* Neutral-labeled answer buttons on soft swatches */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {words.map((name, i) => (
              <button
                key={name}
                onClick={() => handleAnswer(i)}
                className={`relative py-4 rounded-2xl border-2 font-medium text-zen-700
                  active:scale-[0.97] transition-all ${SWATCH_CLASSES[i]}`}
              >
                {name}
                <span className="absolute top-1.5 right-2.5 text-[10px] text-zen-300 font-mono">
                  {i + 1}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'finished' && result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col items-center gap-4 bg-white border border-zen-200
            rounded-3xl py-8 px-6 text-center"
        >
          <div className="text-sm text-zen-400">{t('game.stroop.finished')}</div>
          <div className="text-6xl font-bold text-zen-800 tabular-nums">{result.score}</div>
          <div className="text-sm text-zen-500 -mt-2">{t('game.stroop.score')}</div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-zen-500 tabular-nums">
            <span>
              {t('game.stroop.correct')}{' '}
              <b className="text-zen-700">
                {result.correct}/{result.attempted}
              </b>
            </span>
            <span>
              {t('result.accuracy')} <b className="text-zen-700">{result.accuracy}%</b>
            </span>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm ${
              result.isNewBest
                ? 'bg-amber-100 text-amber-700 border border-amber-300 font-medium'
                : 'text-zen-500'
            }`}
          >
            {t('game.stroop.personalBest')} {result.best}
          </div>
          <div className="flex gap-3 mt-2">
            <button
              onClick={(e) => {
                e.currentTarget.blur();
                start();
              }}
              className="px-8 py-3 rounded-xl bg-sage-500 text-white font-medium
                hover:bg-sage-600 active:scale-[0.98] transition-all shadow-sm"
            >
              {t('game.stroop.again')}
            </button>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="px-8 py-3 rounded-xl bg-zen-100 text-zen-600 font-medium
                hover:bg-zen-200 active:scale-[0.98] transition-all"
            >
              {t('result.backHome')}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
