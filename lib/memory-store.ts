"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";

export type Memory = {
  id: string;
  text: string;
  createdAt: number;
};

type MemoryState = {
  memories: Memory[];
  hasHydrated: boolean;
  addMemory: (text: string) => Memory;
  removeMemory: (id: string) => void;
  clearMemories: () => void;
};

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
} as Storage;

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      memories: [],
      hasHydrated: false,
      addMemory: (text) => {
        const trimmed = text.trim();
        if (!trimmed) {
          return { id: "", text: "", createdAt: 0 };
        }
        // De-duplicate (case-insensitive exact match) — silently return the
        // existing one if the model re-asserts the same fact.
        const existing = get().memories.find(
          (m) => m.text.toLowerCase() === trimmed.toLowerCase()
        );
        if (existing) return existing;
        const memory: Memory = {
          id: nanoid(),
          text: trimmed,
          createdAt: Date.now(),
        };
        set({ memories: [...get().memories, memory] });
        return memory;
      },
      removeMemory: (id) =>
        set({ memories: get().memories.filter((m) => m.id !== id) }),
      clearMemories: () => set({ memories: [] }),
    }),
    {
      name: "chatbot-ui:memories",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage
      ),
      partialize: (state) => ({ memories: state.memories }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          setTimeout(() => {
            useMemoryStore.setState({ hasHydrated: true });
          }, 0);
        }
      },
    }
  )
);
