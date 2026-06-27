/**
 * Pins Manager
 *
 * Manages user-configurable and reorderable pinned actions for the command palette.
 * Defaults to "Place bet", "Claim", and "Open profile".
 */

export interface PinnedAction {
  id: string;
  label: string;
  url: string;
  iconName: string; // lucide-react name mapping
}

export const ALL_AVAILABLE_ACTIONS: PinnedAction[] = [
  { id: "place-bet", label: "Place bet", url: "/events", iconName: "CircleDollarSign" },
  { id: "claim", label: "Claim", url: "/mypredictions?tab=completed", iconName: "Trophy" },
  { id: "profile", label: "Open profile", url: "/profile", iconName: "User" },
  { id: "help", label: "Help / FAQs", url: "/help", iconName: "HelpCircle" },
  { id: "settings", label: "Settings", url: "/settings", iconName: "Settings" }
];

const LOCAL_STORAGE_KEY = "command-palette.pinned-actions";
const DEFAULT_ACTION_IDS = ["place-bet", "claim", "profile"];

/**
 * Get active pinned actions in order.
 * If none are saved, returns the default action list.
 */
export function getPinnedActions(): PinnedAction[] {
  if (typeof window === "undefined") {
    return ALL_AVAILABLE_ACTIONS.filter(a => DEFAULT_ACTION_IDS.includes(a.id));
  }

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) {
      return ALL_AVAILABLE_ACTIONS.filter(a => DEFAULT_ACTION_IDS.includes(a.id));
    }
    const ids: string[] = JSON.parse(stored);
    if (!Array.isArray(ids) || ids.length === 0) {
      return ALL_AVAILABLE_ACTIONS.filter(a => DEFAULT_ACTION_IDS.includes(a.id));
    }
    // Map ids back to the PinnedAction definitions, maintaining stored order
    return ids
      .map(id => ALL_AVAILABLE_ACTIONS.find(a => a.id === id))
      .filter((a): a is PinnedAction => !!a);
  } catch (e) {
    console.error("Failed to parse pinned actions from localStorage", e);
    return ALL_AVAILABLE_ACTIONS.filter(a => DEFAULT_ACTION_IDS.includes(a.id));
  }
}

/**
 * Save pinned action IDs to localStorage.
 */
export function savePinnedActions(ids: string[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error("Failed to save pinned actions to localStorage", e);
  }
}
