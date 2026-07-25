export type ShortcutKey = 'search' | 'confirmBet' | 'newEvent' | 'goToAnalytics';

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
};

export function getShortcut(key: ShortcutKey): ShortcutDefinition | undefined {
  return SHORTCUTS[key];
}
