export type ShortcutKey = 'search' | 'confirmBet' | 'newEvent' | 'goToAnalytics' | 'shareMarket' | 'placeBet';

export interface ShortcutDefinition {
  key: string;
  mac: string[];
  win: string[];
  label: string;
}

export const SHORTCUTS: Record<ShortcutKey, ShortcutDefinition> = {
  search: {
    key: 'search',
    mac: ['meta', 'k'],
    win: ['ctrl', 'k'],
    label: 'Search',
  },
  confirmBet: {
    key: 'confirmBet',
    mac: ['enter'],
    win: ['enter'],
    label: 'Confirm',
  },
  newEvent: {
    key: 'newEvent',
    mac: ['meta', 'shift', 'n'],
    win: ['ctrl', 'shift', 'n'],
    label: 'New Event',
  },
  goToAnalytics: {
    key: 'goToAnalytics',
    mac: ['meta', 'shift', 'a'],
    win: ['ctrl', 'shift', 'a'],
    label: 'Analytics',
  },
  /**
   * shareMarket — triggers the Share action on the active MarketDetail page.
   * Mac: ⌘ + Shift + S   Win: Ctrl + Shift + S
   */
  shareMarket: {
    key: 'shareMarket',
    mac: ['meta', 'shift', 's'],
    win: ['ctrl', 'shift', 's'],
    label: 'Share market',
  },
  /**
   * placeBet — focuses the bet amount input on the active MarketDetail page.
   * Mac: ⌘ + B   Win: Ctrl + B
   */
  placeBet: {
    key: 'placeBet',
    mac: ['meta', 'b'],
    win: ['ctrl', 'b'],
    label: 'Place bet',
  },
};

export function getShortcut(key: ShortcutKey): ShortcutDefinition | undefined {
  return SHORTCUTS[key];
}
