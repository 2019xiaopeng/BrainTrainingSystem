import type { GameMode } from '../types/game';

// TODO: replace with the real production domain before launch
export const SITE_URL = 'https://brain-flow.example.com';

/** Cognitive skill bucket shown on landing pages (mirrors the product niche) */
export type GameCategory = 'memory' | 'reaction' | 'focus' | 'math';

export interface GameCatalogEntry {
  /** SEO keyword-first URL segment used by /games/:slug */
  slug: string;
  mode: GameMode;
  emoji: string;
  /** i18n keys under the existing home.* section */
  titleKey: string;
  descKey: string;
  category: GameCategory;
}

/** All 9 arcade games, one SEO landing page each */
export const GAME_CATALOG: GameCatalogEntry[] = [
  { slug: 'n-back-challenge', mode: 'numeric', emoji: '🔢', titleKey: 'home.numeric', descKey: 'home.numericDesc', category: 'memory' },
  { slug: 'spatial-memory', mode: 'spatial', emoji: '🎯', titleKey: 'home.spatial', descKey: 'home.spatialDesc', category: 'memory' },
  { slug: 'devilish-mice', mode: 'mouse', emoji: '🐭', titleKey: 'home.mouse', descKey: 'home.mouseDesc', category: 'memory' },
  { slug: 'people-counting', mode: 'house', emoji: '🏠', titleKey: 'home.house', descKey: 'home.houseDesc', category: 'memory' },
  { slug: 'reaction-time-test', mode: 'reaction', emoji: '⚡', titleKey: 'home.reaction', descKey: 'home.reactionDesc', category: 'reaction' },
  { slug: 'number-memory', mode: 'numberMemory', emoji: '🧠', titleKey: 'home.numberMemory', descKey: 'home.numberMemoryDesc', category: 'memory' },
  { slug: 'sequence-memory', mode: 'sequence', emoji: '🧩', titleKey: 'home.sequence', descKey: 'home.sequenceDesc', category: 'memory' },
  { slug: 'stroop-test', mode: 'stroop', emoji: '🎨', titleKey: 'home.stroop', descKey: 'home.stroopDesc', category: 'focus' },
  { slug: 'color-perception-test', mode: 'colorPerception', emoji: '🌈', titleKey: 'home.colorPerception', descKey: 'home.colorPerceptionDesc', category: 'focus' },
  { slug: 'hippocampus-test', mode: 'hippocampus', emoji: '🔢', titleKey: 'home.hippocampus', descKey: 'home.hippocampusDesc', category: 'memory' },
];

export const getGameBySlug = (slug: string): GameCatalogEntry | undefined =>
  GAME_CATALOG.find((g) => g.slug === slug);
