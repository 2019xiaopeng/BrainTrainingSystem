import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GAME_CATALOG, SITE_URL, getGameBySlug } from '../../lib/games';
import { getReference } from '../../lib/referenceValues';
import { useGameStore } from '../../store/gameStore';
import { MOUSE_DIFFICULTY_MAP } from '../../types/game';
import { useReactionGame } from '../../hooks/useReactionGame';
import { useNumberMemoryGame } from '../../hooks/useNumberMemoryGame';
import { useSequenceMemoryGame } from '../../hooks/useSequenceMemoryGame';
import { useStroopGame } from '../../hooks/useStroopGame';
import { useMathSprintGame } from '../../hooks/useMathSprintGame';
import { NumericKeypad } from '../game/NumericKeypad';
import { ProgressBar } from '../game/arcade';
import { COLOR_WORDS, INK_CLASSES, SWATCH_CLASSES } from '../../lib/stroop';
import { InstrumentReadout } from '../game/InstrumentReadout';

/**
 * GameLandingScreen - SEO landing page per game (/games/:slug)
 * Reaction gets the "instrument" layout (playable on the page, HB-style);
 * other games get protocol + CTA (their dossiers follow, docs/game-dossiers/).
 * Rendered inside MainLayout, which already provides the <main> landmark.
 */

/** Per-mode Morandi identity hue for the readout tick + accents */
const MODE_HUE: Record<string, string> = {
  reaction: '#9C5F46',
  numberMemory: '#4A6B8A',
  sequence: '#2B6E68',
  stroop: '#7C5F98',
  mathSprint: '#84663B',
};
export function GameLandingScreen() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const gameConfigs = useGameStore((s) => s.gameConfigs);
  const setNextConfig = useGameStore((s) => s.setNextConfig);
  const game = getGameBySlug(slug);

  // Per-page <title> + meta description (SPA: set imperatively, restore on unmount)
  useEffect(() => {
    if (!game) return;
    const name = t(game.titleKey);
    document.title = `${name} — Free Online Brain Game | Brain Flow`;

    const existing = document.querySelector<HTMLMetaElement>('head > meta[name="description"]');
    const meta: HTMLMetaElement = existing ?? document.createElement('meta');
    if (!existing) {
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const prevContent = meta.content;
    meta.content = t('gameLanding.metaDescription', { game: name, description: t(game.descKey) });

    return () => {
      meta.content = prevContent;
      if (!existing) meta.remove();
    };
  }, [game, t]);

  if (!game) return <Navigate to="/" replace />;

  const title = t(game.titleKey);
  const description = t(game.descKey);

  // How-to-play reuses the home.*Help keys with the same params HomeScreen passes
  let helpText: string;
  switch (game.mode) {
    case 'numeric':
      helpText = t('home.numericHelp', { n: gameConfigs.numeric.nLevel });
      break;
    case 'spatial':
      helpText = t('home.spatialHelp', { grid: gameConfigs.spatial.gridSize, n: gameConfigs.spatial.nLevel });
      break;
    case 'mouse': {
      const { count, grid, difficulty } = gameConfigs.mouse;
      const mice = Math.min(count, grid[0] * grid[1] - 1);
      helpText = t('home.mouseHelp', {
        mice,
        cats: grid[0] * grid[1] - mice,
        grid: `${grid[0]}×${grid[1]}`,
        pushes: MOUSE_DIFFICULTY_MAP[difficulty].pushes,
      });
      break;
    }
    case 'house':
      helpText = t('home.houseHelp', {
        initial: gameConfigs.house.initialPeople,
        events: gameConfigs.house.eventCount,
        speed: t(`speed.${gameConfigs.house.speed}`),
      });
      break;
    case 'reaction':
      helpText = t('home.reactionHelp');
      break;
    case 'numberMemory':
      helpText = t('home.numberMemoryHelp');
      break;
    case 'sequence':
      helpText = t('home.sequenceHelp');
      break;
    case 'stroop':
      helpText = t('home.stroopHelp');
      break;
    default:
      helpText = t('home.mathSprintHelp');
      break;
  }

  // TrainPage runs n-back sessions off nextConfig, so seed it for the target mode
  // (mouse/house/arcade modes read their own gameConfigs in TrainPage)
  const handlePlay = () => {
    if (game.mode === 'numeric') {
      setNextConfig({ nLevel: gameConfigs.numeric.nLevel, totalRounds: gameConfigs.numeric.rounds, mode: 'numeric', gridSize: 3 });
    } else if (game.mode === 'spatial') {
      setNextConfig({ nLevel: gameConfigs.spatial.nLevel, totalRounds: gameConfigs.spatial.rounds, mode: 'spatial', gridSize: gameConfigs.spatial.gridSize });
    }
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: title,
    description,
    genre: ['Educational', 'Puzzle'],
    gamePlatform: 'Web browser',
    applicationCategory: 'Game',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    inLanguage: i18n.language?.split('-')[0] ?? 'en',
    url: `${SITE_URL}/games/${game.slug}`,
  };

  const faqPairs = [
    ['gameLanding.faqFreeQ', 'gameLanding.faqFreeA'],
    ['gameLanding.faqAccountQ', 'gameLanding.faqAccountA'],
    ['gameLanding.faqMobileQ', 'gameLanding.faqMobileA'],
  ] as const;

  if (game.mode === 'reaction') {
    return <ReactionInstrumentLanding slug={game.slug} helpText={helpText} faqPairs={faqPairs} />;
  }

  if (game.mode === 'numberMemory') {
    return <NumberMemoryInstrumentLanding slug={game.slug} helpText={helpText} faqPairs={faqPairs} />;
  }

  if (game.mode === 'sequence') {
    return <SequenceInstrumentLanding slug={game.slug} helpText={helpText} faqPairs={faqPairs} />;
  }

  if (game.mode === 'stroop') {
    return <StroopInstrumentLanding slug={game.slug} helpText={helpText} faqPairs={faqPairs} />;
  }

  if (game.mode === 'mathSprint') {
    return <MathSprintInstrumentLanding slug={game.slug} helpText={helpText} faqPairs={faqPairs} />;
  }

  return (
    <article className="space-y-6 pt-8 pb-4 animate-fade-in">
      <header className="text-center space-y-3">
        <div className="text-5xl" aria-hidden="true">{game.emoji}</div>
        <h1 className="text-4xl font-light text-zen-700 tracking-wider">{title}</h1>
        <p className="text-sm text-zen-400">{description}</p>
        <Link
          to={`/train/${game.mode}`}
          onClick={handlePlay}
          className="inline-block px-10 py-4 rounded-xl bg-sage-500 text-white text-lg font-medium
                     hover:bg-sage-600 active:scale-[0.98] transition-all shadow-sm"
        >
          ▶ {t('gameLanding.playNow')}
        </Link>
      </header>

      <section className="bg-white rounded-xl p-6 shadow-sm border border-zen-200" aria-labelledby="how-to-play-heading">
        <h2 id="how-to-play-heading" className="text-lg font-medium text-zen-600 mb-3">{t('gameLanding.howToPlay')}</h2>
        <p className="text-sm text-zen-500 leading-relaxed">{helpText}</p>
      </section>

      <LandingFaq faqPairs={faqPairs} />
      <LandingGamesIndex currentSlug={game.slug} />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </article>
  );
}

/** Shared FAQ block */
function LandingFaq({ faqPairs }: { faqPairs: readonly (readonly [string, string])[] }) {
  const { t } = useTranslation();
  return (
    <section className="mt-8 space-y-4" aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="font-mono text-xs tracking-[0.22em] text-sage-700">{t('gameLanding.faqTitle')}</h2>
      {faqPairs.map(([q, a]) => (
        <div key={q}>
          <h3 className="text-sm font-medium text-zen-900">{t(q)}</h3>
          <p className="text-sm text-zen-700 mt-1">{t(a)}</p>
        </div>
      ))}
    </section>
  );
}

/** Shared compact all-games index (mono rows, hue ticks — the instrument standard) */
function LandingGamesIndex({ currentSlug }: { currentSlug: string }) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="more-games-heading">
      <h2 id="more-games-heading" className="font-mono text-xs tracking-[0.22em] text-sage-700 pb-3 border-b-2 border-zen-300">
        {t('gameLanding.allGames')} — 01–09
      </h2>
      <nav>
        {GAME_CATALOG.map((g, i) => (
          <Link
            key={g.slug}
            to={g.slug === currentSlug ? '#' : `/games/${g.slug}`}
            className="grid grid-cols-[2rem_auto_1fr] sm:grid-cols-[2rem_0.9rem_1fr_auto] gap-3 items-baseline
                       py-3 border-b border-zen-200 group"
          >
            <span className="font-mono text-xs text-zen-500">{String(i + 1).padStart(2, '0')}</span>
            <span className="w-2.5 h-2.5 rounded-[2px] group-hover:scale-125 transition-transform justify-self-center" style={{ backgroundColor: MODE_HUE[g.mode] ?? '#8D7F6D' }} aria-hidden="true" />
            <span>
              <span className="block text-[15px] font-semibold text-zen-900 group-hover:text-sage-700 group-hover:underline underline-offset-4">{t(g.titleKey)}</span>
              <span className="block text-[13px] text-zen-700">{t(g.descKey)}</span>
            </span>
            <span className="hidden sm:block font-mono text-xs text-zen-700">—</span>
          </Link>
        ))}
      </nav>
    </section>
  );
}

/**
 * Reaction's landing = the instrument: the pad IS the hero, playable in place
 * (docs/game-dossiers/01-reaction-time-test.md §8).
 */
function ReactionInstrumentLanding({
  slug,
  helpText,
  faqPairs,
}: {
  slug: string;
  helpText: string;
  faqPairs: readonly (readonly [string, string])[];
}) {
  const { t } = useTranslation();
  const trials = useGameStore((s) => s.gameConfigs.reaction.trials);
  const sessionHistory = useGameStore((s) => s.sessionHistory);
  const engine = useReactionGame(trials);
  const { phase, doneCount, lastMs, result, bestMs, start, tap } = engine;
  const padRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef(false);

  const ref = getReference('reaction');

  // Collect per-tap ms chips as the run progresses
  const [taps, setTaps] = useState<number[]>([]);
  useEffect(() => {
    if (phase === 'feedback' && lastMs !== null) setTaps((prev) => [...prev, lastMs]);
    if (phase === 'idle' && doneCount === 0) setTaps([]);
  }, [phase, lastMs, doneCount]);

  // Persist finished runs so the history sparkline is real data
  useEffect(() => {
    if (phase === 'finished' && result && !savedRef.current) {
      savedRef.current = true;
      useGameStore.getState().saveSession(result.session);
    }
    if (phase !== 'finished') savedRef.current = false;
  }, [phase, result]);

  // Space / Enter play from anywhere on the page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === 'BUTTON' || tag === 'A' || document.activeElement === padRef.current) return;
      e.preventDefault();
      tap();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tap]);

  const historySeries = sessionHistory
    .filter((h) => h.mode === 'reaction' && typeof h.avgReactionTimeMs === 'number')
    .slice(-10)
    .map((h) => h.avgReactionTimeMs as number);

  const padState =
    phase === 'waiting' ? 'wait' : phase === 'ready' ? 'go' : phase === 'tooSoon' ? 'early' : phase === 'feedback' || phase === 'finished' ? 'result' : 'idle';

  const padWord =
    phase === 'waiting' ? t('game.reaction.waitForGreen')
    : phase === 'ready' ? t('game.reaction.clickNow')
    : phase === 'tooSoon' ? t('game.reaction.tooSoon')
    : phase === 'feedback' || phase === 'finished' ? (lastMs !== null ? `${lastMs}` : '')
    : t('game.reaction.tapToStart');

  const padSub =
    phase === 'idle' ? t('gameLanding.reactionSub')
    : phase === 'waiting' ? t('game.reaction.waitForGreenSub')
    : phase === 'ready' ? t('game.reaction.clickNowSub')
    : phase === 'tooSoon' ? t('game.reaction.tooSoonSub')
    : (phase === 'feedback' || phase === 'finished') && lastMs !== null ? `${lastMs} ${t('game.reaction.ms')} — ${t('game.reaction.tapContinue')}`
    : '';

  return (
    <article className="max-w-3xl mx-auto pt-6 pb-4 animate-fade-in">
      <header className="space-y-2">
        <p className="font-mono text-xs tracking-[0.22em] text-sage-700">REACTION TIME TEST — 01</p>
        <h1 className="text-[clamp(1.4rem,3.4vw,1.75rem)] font-semibold leading-tight text-zen-900">{t('gameLanding.hook.reaction')}</h1>
        <p className="font-mono text-[12.5px] text-zen-700">
          {t('game.reaction.personalBest')} <b className="text-sage-700 font-bold">{bestMs !== null ? `${bestMs} ${t('game.reaction.ms')}` : '—'}</b>
          {ref && <> · {t('instrument.typical')} <b className="text-sage-700 font-bold">{ref.value} {ref.unit}</b>{' '}
            <span className="text-zen-500">({ref.source}, ≈81M)</span></>}
        </p>
      </header>

      {/* The pad — the page's hero. Stimulus colors are lab equipment, exempt from the theme. */}
      <div
        ref={padRef}
        role="button"
        tabIndex={0}
        data-state={padState}
        onPointerDown={(e) => { e.preventDefault(); tap(); }}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tap(); } }}
        aria-label={`${t('game.reaction.title')}: ${helpText}`}
        className={`mt-4 min-h-[52vh] sm:min-h-[60vh] rounded-[10px] border-2 flex flex-col items-center justify-center gap-2.5
          cursor-pointer select-none outline-none touch-manipulation focus-visible:ring-4 focus-visible:ring-sage-200
          ${padTone(padState)}`}
        style={padState === 'go' || padState === 'wait' ? { transition: 'none' } : undefined}
      >
        <p className="font-bold text-[clamp(2rem,6vw,4rem)] leading-tight tracking-tight uppercase text-center px-4">{padWord}</p>
        {padSub && <p className="font-mono text-[13px] opacity-80 text-center max-w-[34ch] px-4">{padSub}</p>}
      </div>

      {/* Series progress chips */}
      {(phase !== 'idle' || result) && (
        <div className="flex items-center gap-2.5 flex-wrap mt-3 font-mono text-xs text-zen-700">
          <span className="font-bold tracking-[0.1em]">{t('game.reaction.trialOf', { current: Math.min(doneCount + 1, trials), total: trials })}</span>
          <span className="flex gap-1.5 flex-wrap">
            {(result ? result.session.rounds.map((r) => r.reactionTimeMs as number) : taps).map((ms, i) => (
              <i key={i} className="not-italic bg-zen-100 border border-zen-200 rounded px-2 py-0.5 font-medium tabular-nums">{ms}</i>
            ))}
          </span>
        </div>
      )}

      {result && (
        <InstrumentReadout
          mode="reaction"
          hue={MODE_HUE.reaction}
          score={result.medianMs}
          scoreUnit={t('game.reaction.ms')}
          scoreCaption={t('instrument.medianOf', { total: trials })}
          series={[...historySeries.slice(0, -1), result.medianMs]}
          onPlayAgain={() => { start(); padRef.current?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          onAllGames={() => document.getElementById('games-index')?.scrollIntoView({ behavior: 'smooth' })}
        />
      )}

      <section className="mt-16 pt-6 border-t-2 border-zen-300 space-y-3" aria-labelledby="about-heading">
        <h2 id="about-heading" className="font-mono text-xs tracking-[0.22em] text-sage-700">{t('gameLanding.aboutTitle')}</h2>
        <p className="text-sm text-zen-700 max-w-[60ch] leading-relaxed">{t('gameLanding.about.reaction.1')}</p>
        <p className="text-sm text-zen-700 max-w-[60ch] leading-relaxed">{t('gameLanding.about.reaction.2')}</p>
        <p className="font-mono text-[11px] text-zen-500">{t('gameLanding.about.reaction.source')}</p>
      </section>

      <div className="mt-10" id="games-index">
        <LandingGamesIndex currentSlug={slug} />
      </div>
      <div className="mt-8">
        <LandingFaq faqPairs={faqPairs} />
      </div>
      <p className="mt-8 font-mono text-[11px] tracking-[0.12em] text-zen-500 text-center">
        BRAIN FLOW — {t('gameLanding.footerLocal')}
      </p>
    </article>
  );
}

/** Pad tones per state — stimulus red/green are the lab standard, not theme colors */
function padTone(state: string): string {
  switch (state) {
    case 'wait':
      return 'bg-[#C62828] border-[#C62828] text-zen-50';
    case 'go':
      return 'bg-[#6FBF73] border-[#6FBF73] text-zen-900';
    case 'result':
    case 'early':
      return 'bg-zen-900 border-zen-900 text-zen-100';
    default:
      return 'bg-zen-100 border-dashed border-zen-300 text-zen-700';
  }
}

/** Digits shrink as the string grows so long spans still fit one line */
function digitSizeClass(length: number): string {
  if (length <= 5) return 'text-6xl sm:text-7xl';
  if (length <= 8) return 'text-5xl sm:text-6xl';
  if (length <= 12) return 'text-4xl sm:text-5xl';
  return 'text-3xl sm:text-4xl';
}

/**
 * Math Sprint's landing — equation card + keypad under a shared timer bar;
 * no typical value (unique difficulty curve), history-only readout
 * (docs/game-dossiers/05-math-sprint.md).
 */
function MathSprintInstrumentLanding({
  slug,
  helpText,
  faqPairs,
}: {
  slug: string;
  helpText: string;
  faqPairs: readonly (readonly [string, string])[];
}) {
  const { t } = useTranslation();
  const durationSec = useGameStore((s) => s.gameConfigs.mathSprint.durationSec);
  const sessionHistory = useGameStore((s) => s.sessionHistory);
  const engine = useMathSprintGame();
  const {
    phase, question, input, solved, attempts, timeLeftMs, durationMs,
    best, wrongFlash, startGame, retry, inputDigit, backspace, submit,
  } = engine;
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      startGame(durationSec);
    }
  }, [startGame, durationSec]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      if (e.key === 'Backspace') { e.preventDefault(); backspace(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, submit, backspace]);

  const historySeries = sessionHistory
    .filter((h) => h.mode === 'mathSprint')
    .slice(-10)
    .map((h) => h.score);

  const accuracy = attempts > 0 ? Math.round((solved / attempts) * 100) : 0;

  return (
    <article className="max-w-3xl mx-auto pt-6 pb-4 animate-fade-in">
      <header className="space-y-2">
        <p className="font-mono text-xs tracking-[0.22em] text-sage-700">MATH SPRINT — 05</p>
        <h1 className="text-[clamp(1.4rem,3.4vw,1.75rem)] font-semibold leading-tight text-zen-900">{t('gameLanding.hook.mathSprint')}</h1>
        <p className="font-mono text-[12.5px] text-zen-700">
          {t('game.mathSprint.personalBest')} <b className="text-sage-700 font-bold">{best}</b>
        </p>
      </header>

      {phase !== 'finished' && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between font-mono text-xs text-zen-700">
            <span>{t('game.mathSprint.solved')} <b className="text-zen-900 text-base tabular-nums">{solved}</b></span>
            <span className="tabular-nums">{Math.max(0, Math.ceil(timeLeftMs / 1000))}s</span>
          </div>
          <ProgressBar remainingMs={timeLeftMs} durationMs={durationMs} />
        </div>
      )}

      {/* The equation card — the hero */}
      <div className={`mt-3 min-h-[30vh] rounded-[10px] border-2 flex flex-col items-center justify-center gap-3 px-4
        ${phase === 'finished' ? 'bg-zen-100 border-zen-200' : 'bg-white border-zen-200'} ${wrongFlash ? 'border-rose-400' : ''}`}>
        {phase === 'playing' && question && (
          <>
            <p className="font-mono font-bold text-5xl sm:text-6xl tabular-nums text-zen-900">
              {question.a} {question.op} {question.b} = ?
            </p>
            <p className={`font-mono text-2xl tabular-nums min-h-[1.4em] ${input ? 'text-sage-700' : 'text-zen-400'}`}>
              {input || '···'}
            </p>
          </>
        )}
        {phase === 'idle' && <p className="font-bold text-2xl uppercase text-zen-700">{t('game.mathSprint.tapToStart')}</p>}
        {phase === 'finished' && <p className="font-bold text-2xl uppercase text-zen-700">{t('game.mathSprint.finished')}</p>}
      </div>

      {phase === 'playing' && (
        <div className="mt-3 flex justify-center">
          <NumericKeypad value={input} onInput={inputDigit} onBackspace={backspace} onSubmit={submit} canInput />
        </div>
      )}

      {phase === 'finished' && (
        <InstrumentReadout
          mode="mathSprint"
          hue={MODE_HUE.mathSprint}
          score={solved}
          scoreUnit={t('game.mathSprint.solvedUnit')}
          scoreCaption={t('instrument.stroopCaption', { attempted: attempts, accuracy })}
          series={historySeries}
          onPlayAgain={() => { retry(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          onAllGames={() => document.getElementById('games-index')?.scrollIntoView({ behavior: 'smooth' })}
        />
      )}

      <section className="mt-16 pt-6 border-t-2 border-zen-300 space-y-3" aria-labelledby="about-heading">
        <h2 id="about-heading" className="font-mono text-xs tracking-[0.22em] text-sage-700">{t('gameLanding.aboutTitle')}</h2>
        <p className="text-sm text-zen-700 max-w-[60ch] leading-relaxed">{t('gameLanding.about.mathSprint.1')}</p>
        <p className="text-sm text-zen-700 max-w-[60ch] leading-relaxed">{t('gameLanding.about.mathSprint.2')}</p>
        <p className="font-mono text-[11px] text-zen-500">{t('gameLanding.about.mathSprint.source')}</p>
      </section>

      <div className="mt-10" id="games-index">
        <LandingGamesIndex currentSlug={slug} />
      </div>
      <div className="mt-8">
        <LandingFaq faqPairs={faqPairs} />
      </div>
      <p className="mt-8 font-mono text-[11px] tracking-[0.12em] text-zen-500 text-center">
        BRAIN FLOW — {t('gameLanding.footerLocal')}
      </p>
      <span className="sr-only">{helpText}</span>
    </article>
  );
}

/**
 * Stroop's landing — the word card is the hero under a shared progress bar;
 * no typical value (protocols aren't comparable across sites), so the
 * readout runs history-only (docs/game-dossiers/04-stroop-test.md).
 */
function StroopInstrumentLanding({
  slug,
  helpText,
  faqPairs,
}: {
  slug: string;
  helpText: string;
  faqPairs: readonly (readonly [string, string])[];
}) {
  const { t, i18n } = useTranslation();
  const durationSec = useGameStore((s) => s.gameConfigs.stroop.durationSec);
  const sessionHistory = useGameStore((s) => s.sessionHistory);
  const engine = useStroopGame(durationSec);
  const { phase, trial, score, feedback, timeLeftMs, totalMs, result, best, start, answer } = engine;
  const startedRef = useRef(false);
  const savedRef = useRef<unknown>(null);

  const words =
    COLOR_WORDS[(i18n.resolvedLanguage ?? i18n.language ?? 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en'];

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    start();
  }, [start]);

  // Persist once per finished run (same guard as the game screen)
  useEffect(() => {
    const session = result?.session;
    if (session && session !== savedRef.current) {
      savedRef.current = session;
      useGameStore.getState().saveSession(session);
    }
  }, [result]);

  // 1-4 keyboard answers while playing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4) answer(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, answer]);

  const historySeries = sessionHistory
    .filter((h) => h.mode === 'stroop')
    .slice(-10)
    .map((h) => h.score);

  return (
    <article className="max-w-3xl mx-auto pt-6 pb-4 animate-fade-in">
      <header className="space-y-2">
        <p className="font-mono text-xs tracking-[0.22em] text-sage-700">STROOP TEST — 04</p>
        <h1 className="text-[clamp(1.4rem,3.4vw,1.75rem)] font-semibold leading-tight text-zen-900">{t('gameLanding.hook.stroop')}</h1>
        <p className="font-mono text-[12.5px] text-zen-700">
          {t('game.stroop.personalBest')} <b className="text-sage-700 font-bold">{best ?? '—'}</b>
        </p>
      </header>

      {phase !== 'finished' && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between font-mono text-xs text-zen-700">
            <span>{t('game.stroop.score')} <b className="text-zen-900 text-base tabular-nums">{score}</b></span>
            <span className="tabular-nums">{Math.ceil(timeLeftMs / 1000)}s</span>
          </div>
          <ProgressBar remainingMs={timeLeftMs} durationMs={totalMs} />
        </div>
      )}

      {/* The word card — the hero. Ink = standard stimulus set, theme-exempt. */}
      <div className={`relative mt-3 h-44 sm:h-52 rounded-[10px] border-2 flex items-center justify-center select-none
        ${phase === 'finished' ? 'bg-zen-100 border-zen-200 opacity-40' : 'bg-white border-zen-200'}`}>
        {trial && phase === 'playing' && (
          <>
            <span className={`text-6xl sm:text-7xl font-bold tracking-wide ${INK_CLASSES[trial.inkIndex]}`}>
              {words[trial.wordIndex]}
            </span>
            {(feedback === 'correct' || feedback === 'wrong') && (
              <span
                aria-hidden="true"
                className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center
                  text-sm font-bold text-white ${feedback === 'correct' ? 'bg-emerald-500' : 'bg-rose-500'}`}
              >
                {feedback === 'correct' ? '✓' : '✗'}
              </span>
            )}
          </>
        )}
        {phase === 'idle' && <p className="font-bold text-2xl uppercase text-zen-700">{t('game.stroop.tapToStart')}</p>}
        {phase === 'finished' && <p className="font-bold text-2xl uppercase text-zen-700">{t('game.stroop.finished')}</p>}
      </div>

      {phase === 'playing' && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {words.map((name, i) => (
            <button
              key={i}
              type="button"
              onClick={() => answer(i)}
              className={`px-4 py-4 rounded-[10px] border-2 text-base font-semibold text-zen-800
                active:scale-95 transition-all ${SWATCH_CLASSES[i]}`}
            >
              {name}
              <span className="block font-mono text-[10px] text-zen-400 mt-0.5">{i + 1}</span>
            </button>
          ))}
        </div>
      )}

      {result && (
        <InstrumentReadout
          mode="stroop"
          hue={MODE_HUE.stroop}
          score={result.score}
          scoreUnit={t('game.stroop.correctUnit')}
          scoreCaption={t('instrument.stroopCaption', { attempted: result.attempted, accuracy: result.accuracy })}
          series={historySeries}
          onPlayAgain={() => { start(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          onAllGames={() => document.getElementById('games-index')?.scrollIntoView({ behavior: 'smooth' })}
        />
      )}

      <section className="mt-16 pt-6 border-t-2 border-zen-300 space-y-3" aria-labelledby="about-heading">
        <h2 id="about-heading" className="font-mono text-xs tracking-[0.22em] text-sage-700">{t('gameLanding.aboutTitle')}</h2>
        <p className="text-sm text-zen-700 max-w-[60ch] leading-relaxed">{t('gameLanding.about.stroop.1')}</p>
        <p className="text-sm text-zen-700 max-w-[60ch] leading-relaxed">{t('gameLanding.about.stroop.2')}</p>
        <p className="font-mono text-[11px] text-zen-500">{t('gameLanding.about.stroop.source')}</p>
      </section>

      <div className="mt-10" id="games-index">
        <LandingGamesIndex currentSlug={slug} />
      </div>
      <div className="mt-8">
        <LandingFaq faqPairs={faqPairs} />
      </div>
      <p className="mt-8 font-mono text-[11px] tracking-[0.12em] text-zen-500 text-center">
        BRAIN FLOW — {t('gameLanding.footerLocal')}
      </p>
      <span className="sr-only">{helpText}</span>
    </article>
  );
}

/**
 * Sequence Memory's landing — the grid is the hero, flashing its pattern,
 * ink readout on the fatal miss (docs/game-dossiers/03-sequence-memory.md).
 */
function SequenceInstrumentLanding({
  slug,
  helpText,
  faqPairs,
}: {
  slug: string;
  helpText: string;
  faqPairs: readonly (readonly [string, string])[];
}) {
  const { t } = useTranslation();
  const gridSize = useGameStore((s) => s.gameConfigs.sequence.gridSize);
  const sessionHistory = useGameStore((s) => s.sessionHistory);
  const engine = useSequenceMemoryGame();
  const { phase, lit, inputIdx, best, finalLength, wrongCell, startGame, retry, pressCell } = engine;
  const startedRef = useRef(false);

  const ref = getReference('sequence');
  const size = gridSize;
  const cells = Array.from({ length: size * size }, (_, i) => i);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      startGame(gridSize);
    }
  }, [startGame, gridSize]);

  const historySeries = sessionHistory
    .filter((h) => h.mode === 'sequence' && h.totalRounds > 0)
    .slice(-10)
    .map((h) => h.totalRounds);

  const cellClass = (i: number): string => {
    if (i === lit) return 'bg-sage-500 border-sage-600';
    if (phase === 'finished' && wrongCell === i) return 'bg-rose-300 border-rose-400';
    if (phase === 'finished') return 'bg-zen-100 border-zen-200';
    if (phase === 'input' && inputIdx > 0 && i === -2) return '';
    return 'bg-zen-100 border-zen-200 hover:border-sage-400';
  };

  const surfaceNote =
    phase === 'showing' ? t('game.sequence.watch')
    : phase === 'input' ? t('game.sequence.repeat')
    : phase === 'feedback' ? t('game.numberMemory.correct')
    : phase === 'finished' ? t('game.sequence.gameOver')
    : t('game.sequence.tapToStart');

  return (
    <article className="max-w-3xl mx-auto pt-6 pb-4 animate-fade-in">
      <header className="space-y-2">
        <p className="font-mono text-xs tracking-[0.22em] text-sage-700">SEQUENCE MEMORY — 03</p>
        <h1 className="text-[clamp(1.4rem,3.4vw,1.75rem)] font-semibold leading-tight text-zen-900">{t('gameLanding.hook.sequence')}</h1>
        <p className="font-mono text-[12.5px] text-zen-700">
          {t('game.sequence.personalBest')} <b className="text-sage-700 font-bold">{best > 0 ? best : '—'}</b>
          {ref && <> · {t('instrument.typical')} <b className="text-sage-700 font-bold">{ref.value} {t('game.sequence.levelsUnit')}</b>{' '}
            <span className="text-zen-500">({ref.source})</span></>}
        </p>
      </header>

      {/* The grid — the page's hero */}
      <div className="mt-4 min-h-[46vh] sm:min-h-[52vh] rounded-[10px] border-2 border-dashed border-zen-300 bg-zen-100
        flex flex-col items-center justify-center gap-5 px-4 py-8">
        <p className="font-mono text-xs text-zen-500">{surfaceNote}</p>
        <div
          className="grid gap-2 sm:gap-3 w-full max-w-xs sm:max-w-sm"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {cells.map((i) => (
            <button
              key={i}
              type="button"
              aria-label={String(i + 1)}
              disabled={phase !== 'input'}
              onClick={() => pressCell(i)}
              className={`aspect-square rounded-lg border-2 transition-colors duration-150
                disabled:cursor-default enabled:cursor-pointer ${cellClass(i)}`}
            />
          ))}
        </div>
        {phase === 'finished' && (
          <p className="font-mono text-xs text-zen-500">
            {t('game.sequence.reached', { level: finalLength })}
          </p>
        )}
      </div>

      {phase === 'finished' && (
        <InstrumentReadout
          mode="sequence"
          hue={MODE_HUE.sequence}
          score={finalLength}
          scoreUnit={t('game.sequence.levelsUnit')}
          scoreCaption={t('instrument.levelsReached')}
          series={historySeries}
          onPlayAgain={() => { retry(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          onAllGames={() => document.getElementById('games-index')?.scrollIntoView({ behavior: 'smooth' })}
        />
      )}

      <section className="mt-16 pt-6 border-t-2 border-zen-300 space-y-3" aria-labelledby="about-heading">
        <h2 id="about-heading" className="font-mono text-xs tracking-[0.22em] text-sage-700">{t('gameLanding.aboutTitle')}</h2>
        <p className="text-sm text-zen-700 max-w-[60ch] leading-relaxed">{t('gameLanding.about.sequence.1')}</p>
        <p className="text-sm text-zen-700 max-w-[60ch] leading-relaxed">{t('gameLanding.about.sequence.2')}</p>
        <p className="font-mono text-[11px] text-zen-500">{t('gameLanding.about.sequence.source')}</p>
      </section>

      <div className="mt-10" id="games-index">
        <LandingGamesIndex currentSlug={slug} />
      </div>
      <div className="mt-8">
        <LandingFaq faqPairs={faqPairs} />
      </div>
      <p className="mt-8 font-mono text-[11px] tracking-[0.12em] text-zen-500 text-center">
        BRAIN FLOW — {t('gameLanding.footerLocal')}
      </p>
      <span className="sr-only">{helpText}</span>
    </article>
  );
}

/**
 * Number Memory's landing — same instrument pattern: the digit surface is
 * the hero, keypad below, ink readout on game over
 * (docs/game-dossiers/02-number-memory.md).
 */
function NumberMemoryInstrumentLanding({
  slug,
  helpText,
  faqPairs,
}: {
  slug: string;
  helpText: string;
  faqPairs: readonly (readonly [string, string])[];
}) {
  const { t } = useTranslation();
  const startDigits = useGameStore((s) => s.gameConfigs.numberMemory.startDigits);
  const sessionHistory = useGameStore((s) => s.sessionHistory);
  const engine = useNumberMemoryGame();
  const { phase, digits, input, best, finalLength, startGame, retry, inputDigit, backspace, submit } = engine;
  const surfaceRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const ref = getReference('numberMemory');

  // Autostart once on mount (same guard pattern as the game screen)
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      startGame(startDigits);
    }
  }, [startGame, startDigits]);

  // Enter submits during input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'input') return;
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      if (e.key === 'Backspace') { e.preventDefault(); backspace(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, submit, backspace]);

  const historySeries = sessionHistory
    .filter((h) => h.mode === 'numberMemory' && h.totalRounds > 0)
    .slice(-10)
    .map((h) => h.totalRounds);

  const playing = phase !== 'finished';

  return (
    <article className="max-w-3xl mx-auto pt-6 pb-4 animate-fade-in">
      <header className="space-y-2">
        <p className="font-mono text-xs tracking-[0.22em] text-sage-700">NUMBER MEMORY — 02</p>
        <h1 className="text-[clamp(1.4rem,3.4vw,1.75rem)] font-semibold leading-tight text-zen-900">{t('gameLanding.hook.numberMemory')}</h1>
        <p className="font-mono text-[12.5px] text-zen-700">
          {t('game.numberMemory.personalBest')} <b className="text-sage-700 font-bold">{best > 0 ? best : '—'}</b>
          {ref && <> · {t('instrument.typical')} <b className="text-sage-700 font-bold">{ref.value} {t('game.numberMemory.digitsUnit')}</b>{' '}
            <span className="text-zen-500">({ref.source})</span></>}
        </p>
      </header>

      {/* The digit surface — the page's hero */}
      <div
        ref={surfaceRef}
        className={`mt-4 min-h-[46vh] sm:min-h-[52vh] rounded-[10px] border-2 flex flex-col items-center justify-center gap-3 px-4
          ${phase === 'showing' ? 'bg-zen-900 border-zen-900 text-zen-100' : 'bg-zen-100 border-dashed border-zen-300 text-zen-700'}`}
      >
        {phase === 'showing' && (
          <>
            <p className={`font-mono font-bold tracking-wider ${digitSizeClass(digits.length)}`}>{digits}</p>
            <p className="font-mono text-xs text-zen-300">{t('game.numberMemory.memorize')}</p>
          </>
        )}
        {phase === 'input' && (
          <>
            <p className={`font-mono font-bold tracking-wider min-h-[1.2em] ${digitSizeClass(Math.max(digits.length, 1))} ${input ? 'text-zen-900' : 'text-zen-400'}`}>
              {input || '·'.repeat(Math.min(digits.length, 12))}
            </p>
            <p className="font-mono text-xs text-zen-500">
              {t('game.numberMemory.inputHint', { count: digits.length })}
            </p>
          </>
        )}
        {phase === 'feedback' && (
          <p className="font-mono text-2xl font-bold text-sage-600">{t('game.numberMemory.correct')}</p>
        )}
        {(phase === 'idle') && (
          <p className="font-bold text-2xl uppercase">{t('game.numberMemory.tapToStart')}</p>
        )}
        {phase === 'finished' && (
          <p className="font-bold text-2xl uppercase text-zen-700">{t('game.numberMemory.gameOver')}</p>
        )}
      </div>

      {phase === 'input' && (
        <div className="mt-3 flex justify-center">
          <NumericKeypad value={input} onInput={inputDigit} onBackspace={backspace} onSubmit={submit} canInput />
        </div>
      )}

      {phase === 'finished' && (
        <InstrumentReadout
          mode="numberMemory"
          hue={MODE_HUE.numberMemory}
          score={finalLength}
          scoreUnit={t('game.numberMemory.digitsUnit')}
          scoreCaption={t('instrument.digitsReached')}
          series={historySeries}
          onPlayAgain={() => { retry(); surfaceRef.current?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          onAllGames={() => document.getElementById('games-index')?.scrollIntoView({ behavior: 'smooth' })}
        />
      )}

      <section className="mt-16 pt-6 border-t-2 border-zen-300 space-y-3" aria-labelledby="about-heading">
        <h2 id="about-heading" className="font-mono text-xs tracking-[0.22em] text-sage-700">{t('gameLanding.aboutTitle')}</h2>
        <p className="text-sm text-zen-700 max-w-[60ch] leading-relaxed">{t('gameLanding.about.numberMemory.1')}</p>
        <p className="text-sm text-zen-700 max-w-[60ch] leading-relaxed">{t('gameLanding.about.numberMemory.2')}</p>
        <p className="font-mono text-[11px] text-zen-500">{t('gameLanding.about.numberMemory.source')}</p>
      </section>

      <div className="mt-10" id="games-index">
        <LandingGamesIndex currentSlug={slug} />
      </div>
      <div className="mt-8">
        <LandingFaq faqPairs={faqPairs} />
      </div>
      <p className="mt-8 font-mono text-[11px] tracking-[0.12em] text-zen-500 text-center">
        BRAIN FLOW — {t('gameLanding.footerLocal')}
      </p>
      {playing && <span className="sr-only">{helpText}</span>}
    </article>
  );
}
