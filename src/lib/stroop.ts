/**
 * Shared Stroop stimulus tables — the standard color-word set.
 * Stimulus colors are lab equipment (red/blue/green/yellow ink), exempt
 * from the theme palette; buttons stay neutral-ink with soft swatches so
 * a button never spells its color in its own color (that would invert
 * the challenge). Used by both the game screen and the landing pad.
 */

export const INK_CLASSES = ['text-red-500', 'text-blue-500', 'text-green-500', 'text-yellow-500'];

export const SWATCH_CLASSES = [
  'bg-red-50 border-red-200 hover:border-red-400',
  'bg-blue-50 border-blue-200 hover:border-blue-400',
  'bg-green-50 border-green-200 hover:border-green-400',
  'bg-yellow-50 border-yellow-200 hover:border-yellow-400',
];

export const COLOR_WORDS: Record<'zh' | 'en', string[]> = {
  en: ['RED', 'BLUE', 'GREEN', 'YELLOW'],
  zh: ['红', '蓝', '绿', '黄'],
};
