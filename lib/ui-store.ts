"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type UIState = {
  sidebarExpanded: boolean;
  language: string;
  hasHydrated: boolean;
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  setLanguage: (lang: string) => void;
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
      // Empty = "no explicit pick yet" → consumers fall back to
      // navigator.language so the bot speaks the user's actual language
      // out of the box.
      language: "",
      hasHydrated: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
      setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: "chatbot-ui:ui",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage
      ),
      partialize: (state) => ({
        sidebarExpanded: state.sidebarExpanded,
        language: state.language,
      }),
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
