"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type UIState = {
  sidebarExpanded: boolean;
  hasHydrated: boolean;
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
};

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
} as Storage;

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarExpanded: false,
      hasHydrated: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
      setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
    }),
    {
      name: "chatbot-ui:ui",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage
      ),
      partialize: (state) => ({ sidebarExpanded: state.sidebarExpanded }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          setTimeout(() => {
            useUIStore.setState({ hasHydrated: true });
          }, 0);
        }
      },
    }
  )
);
