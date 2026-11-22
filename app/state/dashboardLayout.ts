import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import {
  DEFAULT_LAYOUT,
  moveSection,
  normalizeLayout,
  setSectionVisibility,
  type DashboardLayout,
  type DashboardSectionId,
} from "@/lib/dashboard-layout";

export const DASHBOARD_LAYOUT_STORAGE_KEY = "predictify-dashboard-layout-v1";

export interface DashboardLayoutState {
  layout: DashboardLayout;
  hasHydrated: boolean;
  moveUp: (id: DashboardSectionId) => void;
  moveDown: (id: DashboardSectionId) => void;
  hide: (id: DashboardSectionId) => void;
  show: (id: DashboardSectionId) => void;
  reset: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch (error) {
      console.error("dashboard-layout: failed to read local storage", error);
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch (error) {
      console.error("dashboard-layout: failed to write local storage", error);
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch (error) {
      console.error("dashboard-layout: failed to remove local storage item", error);
    }
  },
};

function getSavedLayout(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return (value as Record<string, unknown>).layout;
}

const storage = createJSONStorage(() => safeStorage);

export const useDashboardLayoutStore = create<DashboardLayoutState>()(
  persist(
    (set) => ({
      layout: DEFAULT_LAYOUT.map((item) => ({ ...item })),
      hasHydrated: false,

      moveUp: (id) =>
        set((state) => ({ layout: moveSection(state.layout, id, "up") })),

      moveDown: (id) =>
        set((state) => ({ layout: moveSection(state.layout, id, "down") })),

      hide: (id) =>
        set((state) => ({
          layout: setSectionVisibility(state.layout, id, false),
        })),

      show: (id) =>
        set((state) => ({
          layout: setSectionVisibility(state.layout, id, true),
        })),

      reset: () =>
        set({ layout: DEFAULT_LAYOUT.map((item) => ({ ...item })) }),

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: DASHBOARD_LAYOUT_STORAGE_KEY,
      version: 1,
      storage,
      skipHydration: true,
      partialize: (state) => ({ layout: state.layout }),
      migrate: (persistedState) => ({
        layout: normalizeLayout(getSavedLayout(persistedState)),
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        layout: normalizeLayout(getSavedLayout(persistedState)),
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("dashboard-layout: failed to restore saved layout", error);
        }
        state?.setHasHydrated(true);
      },
    },
  ),
);
