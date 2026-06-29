// src/lib/categories/emojiMap.ts

export type MarketCategory = 'sports' | 'crypto' | 'politics' | 'weather' | 'esports' | string;
export type BinaryOutcome = 'Yes' | 'No';

export const CATEGORY_EMOJI_MAP: Record<string, string> = {
  sports: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/26bd.svg', // ⚽
  crypto: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4b0.svg', // 💰
  politics: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f3db.svg', // 🏛️
  weather: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f324.svg', // 🌤️
  esports: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f3ae.svg', // 🎮
  default: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f3af.svg', // 🎯
};

/**
 * Returns a Twemoji SVG URL for a given market category.
 */
export const getCategoryEmojiUrl = (category?: string): string => {
  if (!category) return CATEGORY_EMOJI_MAP.default;
  const normalized = category.toLowerCase();
  return CATEGORY_EMOJI_MAP[normalized] || CATEGORY_EMOJI_MAP.default;
};
