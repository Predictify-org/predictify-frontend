export type ShortcutKey = 'search' | 'confirmBet';

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
};

export function getShortcut(key: ShortcutKey): ShortcutDefinition | undefined {
  return SHORTCUTS[key];
}
