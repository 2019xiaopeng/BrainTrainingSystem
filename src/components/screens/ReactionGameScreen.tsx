import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useReactionGame } from '../../hooks/useReactionGame';
import type { ReactionPhase } from '../../hooks/useReactionGame';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { useGameStore } from '../../store/gameStore';

/**
 * ReactionGameScreen - 反应力测试
 * Owns its engine lifecycle (started on first tap, not by TrainPage).
 * The whole colored surface is one big tap target; Space/Enter tap too.
 */

// Per-phase surface look (no transition on the background: the red→green
// flip must be instantaneous or the measured reaction time is unfair)
const SURFACE: Record<ReactionPhase, string> = {
  idle: 'bg-zen-100 border border-zen-200 text-zen-700',
  waiting: 'bg-rose-200 text-rose-900',
  ready: 'bg-emerald-400 text-emerald-950',
  tooSoon: 'bg-rose-200 text-rose-900',
  feedback: 'bg-zen-100 border border-zen-200 text-zen-700',
  finished: 'bg-white border border-zen-200 text-zen-800',
};

const msColor = (ms: number): string =>
  ms < 250 ? 'text-emerald-600' : ms < 350 ? 'text-sage-600' : 'text-amber-600';

export function ReactionGameScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const trials = useGameStore((s) => s.gameConfigs.reaction.trials);
  const engine = useReactionGame(trials);
  const { playClick, playFinish, playRecord } = useSoundEffects();
  const { phase, doneCount, lastMs, result, bestMs, start, tap } = engine;

  // Persist the completed run into the global store, exactly once per run
  const savedRef = useRef(result?.session ?? null);
  useEffect(() => {
    const session = result?.session;
    if (session && session !== savedRef.current) {
      savedRef.current = session;
      useGameStore.getState().saveSession(session);
    }
  }, [result]);

  // Phase-edge sounds: valid tap → click, summary → finish (+ record on new best)
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (prevPhaseRef.current === 'ready' && phase === 'feedback') playClick();
    if (phase === 'finished' && prevPhaseRef.current !== 'finished') {
      playFinish();
      if (result?.isNewBest) playRecord();
    }
    prevPhaseRef.current = phase;
  }, [phase, result, playClick, playFinish, playRecord]);

  // Desktop: Space/Enter act as a tap (disabled on the summary so buttons work)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (phase === 'finished') return;
      e.preventDefault();
      if (!e.repeat) tap();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, tap]);

  const currentTrial = Math.min(
    doneCount + (phase === 'waiting' || phase === 'ready' || phase === 'tooSoon' ? 1 : 0),
    trials,
  );
  const inRun = phase === 'waiting' || phase === 'ready' || phase === 'tooSoon' || phase === 'feedback';

  return (
    <div className="w-full animate-fade-in">
      <h1 className="sr-only">{t('game.reaction.title')}</h1>
      <div
        role="button"
        tabIndex={-1}
        onPointerDown={tap}
        className={`relative w-full h-[70vh] max-h-[620px] min-h-[380px] rounded-3xl
          flex items-center justify-center overflow-hidden cursor-pointer
          select-none shadow-sm ${SURFACE[phase]}`}
        style={{ touchAction: 'manipulation' }}
      >
        {inRun && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => navigate('/', { replace: true })}
            className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-white/60 text-sm
              hover:bg-white/90 active:scale-95 transition-all"
          >
            {t('game.quit')}
          </button>
        )}

        {phase !== 'finished' && (
          <div className="absolute bottom-4 text-sm opacity-70 tabular-nums">
            {t('game.reaction.trialOf', { current: currentTrial, total: trials })}
          </div>
        )}

        <motion.div
          key={phase}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col items-center gap-3 px-6 text-center"
        >
          {phase === 'idle' && (
            <>
              <div className="text-2xl font-medium">{t('game.reaction.title')}</div>
              {bestMs !== null && (
                <div className="text-sm opacity-70 tabular-nums">
                  {t('game.reaction.personalBest')} {bestMs} {t('game.reaction.ms')}
                </div>
              )}
              <div className="text-sm opacity-80 animate-pulse">{t('game.reaction.tapToStart')}</div>
            </>
          )}

          {phase === 'waiting' && (
            <div className="text-2xl font-medium opacity-90">{t('game.reaction.waitForGreen')}</div>
          )}

          {phase === 'ready' && (
            <div className="text-3xl sm:text-4xl font-bold tracking-wide">{t('game.reaction.clickNow')}</div>
          )}

          {phase === 'tooSoon' && (
            <div className="text-2xl font-medium">{t('game.reaction.tooSoon')}</div>
          )}

          {phase === 'feedback' && lastMs !== null && (
            <>
              <div className={`text-6xl sm:text-7xl font-bold tabular-nums ${msColor(lastMs)}`}>
                {lastMs}
              </div>
              <div className="text-sm opacity-70">{t('game.reaction.ms')}</div>
            </>
          )}

          {phase === 'finished' && result && (
            <div className="flex flex-col items-center gap-5">
              <div className="flex flex-col items-center gap-1">
                <div className="text-sm text-zen-400">{t('game.reaction.avg')}</div>
                <div className={`text-6xl font-bold tabular-nums ${msColor(result.avgMs)}`}>
                  {result.avgMs}
                  <span className="text-xl font-normal text-zen-400 ml-2">{t('game.reaction.ms')}</span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm tabular-nums">
                <span className="text-zen-500">
                  {t('game.reaction.best')} <b className="text-zen-700">{result.fastestMs}</b> {t('game.reaction.ms')}
                </span>
                <span
                  className={`px-3 py-1 rounded-full ${
                    result.isNewBest
                      ? 'bg-amber-100 text-amber-700 border border-amber-300 font-medium'
                      : 'text-zen-500'
                  }`}
                >
                  {t('game.reaction.personalBest')} {result.bestMs} {t('game.reaction.ms')}
                </span>
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    start();
                  }}
                  className="px-8 py-3 rounded-xl bg-sage-500 text-white font-medium
                    hover:bg-sage-600 active:scale-[0.98] transition-all shadow-sm"
                >
                  {t('game.reaction.again')}
                </button>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => navigate('/', { replace: true })}
                  className="px-8 py-3 rounded-xl bg-zen-100 text-zen-600 font-medium
                    hover:bg-zen-200 active:scale-[0.98] transition-all"
                >
                  {t('result.backHome')}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
