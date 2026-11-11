import { useTranslation } from 'react-i18next';
import { getReference } from '../../lib/referenceValues';
import type { GameMode } from '../../types/game';

/**
 * InstrumentReadout — the "ink room" result card (see docs/animation-review
 * and the instrument design draft): a compact zen-900 panel with the score
 * in sage-light mono, a yours-vs-typical comparison, an optional sparkline,
 * and the two actions. Shared by game screens and landing pages.
 */
export function InstrumentReadout({
  mode,
  hue,
  score,
  scoreUnit,
  scoreCaption,
  series,
  onPlayAgain,
  onAllGames,
}: {
  mode: GameMode;
  /** 11px identity tick color (per-game Morandi hue) */
  hue: string;
  score: number;
  scoreUnit: string;
  scoreCaption: string;
  /** Sparkline points, newest last; empty = history-only layout */
  series: number[];
  onPlayAgain: () => void;
  onAllGames: () => void;
}) {
  const { t } = useTranslation();
  const ref = getReference(mode);

  // Scale the sparkline to its own min/max so any magnitude reads clearly
  const lo = Math.min(...series, ref?.value ?? Infinity);
  const hi = Math.max(...series, ref?.value ?? -Infinity);
  const span = hi - lo || 1;
  const pts = series
    .map((v, i) => `${(i / Math.max(1, series.length - 1)) * 600},${64 - ((v - lo) / span) * 52}`)
    .join(' ');
  const refY = ref ? 64 - ((ref.value - lo) / span) * 52 : null;

  return (
    <section
      className="relative bg-zen-900 rounded-[10px] px-6 sm:px-9 pt-8 pb-7 text-zen-100 mt-6"
      aria-live="polite"
    >
      <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: hue }} aria-hidden="true" />
      <p className="font-mono text-xs tracking-[0.22em] text-sage-200">{t('instrument.result')}</p>
      <p className="font-mono font-bold text-sage-200 text-5xl sm:text-6xl leading-none mt-3 tabular-nums">
        {score}
        <span className="text-base font-normal ml-2">{scoreUnit}</span>
      </p>
      <p className="font-mono text-xs text-zen-300 mt-2">{scoreCaption}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-4 mt-6 pt-5 border-t border-zen-700/45">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-zen-300">{t('instrument.yours')}</p>
          <p className="font-mono font-bold text-lg mt-1 tabular-nums">
            {score} <span className="text-[11px] font-normal text-zen-300 ml-1">{scoreUnit}</span>
          </p>
        </div>
        {ref ? (
          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] text-zen-300">{t('instrument.typical')}</p>
            <p className="font-mono font-bold text-lg mt-1 tabular-nums">
              {ref.value} <span className="text-[11px] font-normal text-zen-300 ml-1">{ref.unit}</span>
            </p>
            <p className="font-mono text-[10.5px] leading-snug text-zen-300 mt-1">
              source: {ref.source} · {ref.note}
            </p>
          </div>
        ) : (
          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] text-zen-300">{t('instrument.typicalNone')}</p>
            <p className="font-mono text-[10.5px] leading-snug text-zen-300 mt-1">{t('instrument.typicalNoneNote')}</p>
          </div>
        )}
        {series.length > 1 && (
          <div className="sm:col-span-2">
            <p className="font-mono text-[11px] tracking-[0.16em] text-zen-300">{t('instrument.history')}</p>
            <svg viewBox="0 0 600 74" preserveAspectRatio="none" className="w-full h-[74px] block mt-1.5" aria-hidden="true">
              {refY !== null && (
                <>
                  <line x1="0" y1={refY} x2="600" y2={refY} stroke="rgba(92,81,69,.5)" strokeWidth="1" strokeDasharray="3 4" />
                  <text x="4" y={Math.max(10, refY - 4)} fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#C4BEB2">
                    {t('instrument.typical')} {ref?.value}
                  </text>
                </>
              )}
              <polyline fill="none" stroke="#B7CDB4" strokeWidth="2" points={pts} />
            </svg>
            <p className="font-mono text-[10.5px] text-zen-300 mt-1">{t('instrument.historyNote', { count: series.length })}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2.5 mt-6 flex-wrap">
        <button
          type="button"
          onClick={onPlayAgain}
          className="font-mono font-bold text-[13px] tracking-[0.06em] rounded bg-sage-200 text-zen-900 px-6 py-3
            hover:bg-[#C9DCC6] transition-colors"
        >
          {t('instrument.playAgain')}
        </button>
        <button
          type="button"
          onClick={onAllGames}
          className="font-mono font-bold text-[13px] tracking-[0.06em] rounded border border-zen-700/60 text-zen-100 px-6 py-3
            hover:border-zen-200 transition-colors"
        >
          {t('instrument.allGames')}
        </button>
      </div>
    </section>
  );
}
