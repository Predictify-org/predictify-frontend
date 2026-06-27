/**
 * compare-store.ts
 *
 * Zustand store for managing the "Compare two markets" selection state.
 * Up to 2 events can be selected; selection persists across filter/search changes.
 */
import { create } from "zustand"
import type { Event } from "@/types/events"

interface CompareState {
  /** IDs of selected events (max 2) */
  selectedIds: string[]
  /** Whether the compare overlay dialog is open */
  overlayOpen: boolean
  /** Toggle selection of an event. Adds if under limit, removes if already selected. */
  toggle: (id: string) => void
  /** Remove a single event from selection */
  deselect: (id: string) => void
  /** Clear all selections and close overlay */
  clear: () => void
  /** Open the compare overlay (requires exactly 2 selected) */
  openOverlay: () => void
  /** Close the overlay without clearing selection */
  closeOverlay: () => void
}

export const MAX_COMPARE = 2

export const useCompareStore = create<CompareState>((set, get) => ({
  selectedIds: [],
  overlayOpen: false,

  toggle(id) {
    const { selectedIds } = get()
    if (selectedIds.includes(id)) {
      set({ selectedIds: selectedIds.filter((s) => s !== id) })
    } else if (selectedIds.length < MAX_COMPARE) {
      set({ selectedIds: [...selectedIds, id] })
    }
    // silently ignore if already at max — UI should disable the checkbox
  },

  deselect(id) {
    set((s) => ({ selectedIds: s.selectedIds.filter((x) => x !== id) }))
  },

  clear() {
    set({ selectedIds: [], overlayOpen: false })
  },

  openOverlay() {
    set({ overlayOpen: true })
  },

  closeOverlay() {
    set({ overlayOpen: false })
  },
}))
