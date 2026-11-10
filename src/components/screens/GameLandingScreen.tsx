import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GAME_CATALOG, SITE_URL, getGameBySlug } from '../../lib/games';
import { useGameStore } from '../../store/gameStore';
import { MOUSE_DIFFICULTY_MAP } from '../../types/game';

/**
 * GameLandingScreen - SEO landing page per game (/games/:slug)
 * H1 + description + Play CTA + how-to-play + FAQ + JSON-LD VideoGame + internal links.
 * Rendered inside MainLayout, which already provides the <main> landmark.
 */
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

      <section className="bg-white rounded-xl p-6 shadow-sm border border-zen-200 space-y-4" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-lg font-medium text-zen-600">{t('gameLanding.faqTitle')}</h2>
        {faqPairs.map(([q, a]) => (
          <div key={q}>
            <h3 className="text-sm font-medium text-zen-700">{t(q)}</h3>
            <p className="text-sm text-zen-500 mt-1">{t(a)}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="more-games-heading">
        <h2 id="more-games-heading" className="text-lg font-medium text-zen-600 mb-3">{t('gameLanding.allGames')}</h2>
        <nav className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {GAME_CATALOG.filter((g) => g.slug !== game.slug).map((g) => (
            <Link
              key={g.slug}
              to={`/games/${g.slug}`}
              className="p-3 rounded-xl border border-zen-200 bg-white text-center
                         hover:border-sage-300 hover:bg-sage-50 transition-all"
            >
              <div className="text-2xl mb-1" aria-hidden="true">{g.emoji}</div>
              <div className="text-sm text-zen-600">{t(g.titleKey)}</div>
            </Link>
          ))}
        </nav>
      </section>

      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </article>
  );
}
