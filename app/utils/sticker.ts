/**
 * Utility for generating stable themed sticker fallbacks for avatars.
 * Themed for the GrantFox campaign.
 */

const THEMES = [
  "bg-gradient-to-br from-amber-400 to-orange-600",
  "bg-gradient-to-br from-orange-500 to-red-600",
  "bg-gradient-to-br from-yellow-400 to-amber-600",
  "bg-gradient-to-br from-rose-400 to-red-500",
  "bg-gradient-to-br from-orange-400 to-rose-600",
];

const FOX_EMOJIS = ["🦊", "🐺", "🦁", "🐯", "🐱"];

/**
 * Generates a stable hash from a string.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export interface ThemedSticker {
  backgroundClass: string;
  emoji: string;
  initial: string;
}

/**
 * Returns a deterministic themed sticker object based on the provided seed (e.g., username).
 */
export function getThemedSticker(seed: string): ThemedSticker {
  if (!seed) {
    return {
      backgroundClass: THEMES[0],
      emoji: FOX_EMOJIS[0],
      initial: "?",
    };
  }

  const hash = hashString(seed);
  
  const themeIndex = hash % THEMES.length;
  const emojiIndex = hash % FOX_EMOJIS.length;
  
  const initial = seed.charAt(0).toUpperCase();

  return {
    backgroundClass: THEMES[themeIndex],
    emoji: FOX_EMOJIS[emojiIndex],
    initial,
  };
}
