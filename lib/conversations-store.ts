"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UIMessage } from "ai";

export type StoredConversation = {
  id: string;
  title: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
  /** Pinned conversations float to the top of the sidebar / recents page. */
  pinnedAt?: number;
  /**
   * Per-chat custom instructions appended to the base system prompt.
   * Persona, base prompt, and memories still apply on top of this.
   */
  systemPrompt?: string;
};

type ConversationsState = {
  conversations: Record<string, StoredConversation>;
  hasHydrated: boolean;
  upsertConversation: (input: {
    id: string;
    title?: string;
    modelId: string;
  }) => void;
  saveMessages: (id: string, messages: UIMessage[]) => void;
  renameConversation: (id: string, title: string) => void;
  deleteConversation: (id: string) => void;
  togglePin: (id: string) => void;
  setSystemPrompt: (id: string, systemPrompt: string | undefined) => void;
};

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
} as Storage;

export const useConversationsStore = create<ConversationsState>()(
  persist(
    (set, get) => ({
      conversations: {},
      hasHydrated: false,
      upsertConversation: ({ id, title, modelId }) => {
        const now = Date.now();
        const existing = get().conversations[id];
        set({
          conversations: {
            ...get().conversations,
            [id]: existing
              ? {
                  ...existing,
                  modelId,
                  title: title ?? existing.title,
                  updatedAt: now,
                }
              : {
                  id,
                  title: title ?? "New chat",
                  modelId,
                  createdAt: now,
                  updatedAt: now,
                  messages: [],
                },
          },
        });
      },
      saveMessages: (id, messages) => {
        const existing = get().conversations[id];
        if (!existing) return;
        set({
          conversations: {
            ...get().conversations,
            [id]: { ...existing, messages, updatedAt: Date.now() },
          },
        });
      },
      renameConversation: (id, title) => {
        const existing = get().conversations[id];
        if (!existing) return;
        set({
          conversations: {
            ...get().conversations,
            [id]: { ...existing, title, updatedAt: Date.now() },
          },
        });
      },
      deleteConversation: (id) => {
        const next = { ...get().conversations };
        delete next[id];
        set({ conversations: next });
      },
      togglePin: (id) => {
        const existing = get().conversations[id];
        if (!existing) return;
        set({
          conversations: {
            ...get().conversations,
            [id]: {
              ...existing,
              pinnedAt: existing.pinnedAt ? undefined : Date.now(),
            },
          },
        });
      },
      setSystemPrompt: (id, systemPrompt) => {
        const existing = get().conversations[id];
        if (!existing) return;
        const trimmed = systemPrompt?.trim();
        set({
          conversations: {
            ...get().conversations,
            [id]: {
              ...existing,
              systemPrompt: trimmed ? trimmed : undefined,
              updatedAt: Date.now(),
            },
          },
        });
      },
    }),
    {
      name: "chatbot-ui:conversations",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage
      ),
      partialize: (state) => ({ conversations: state.conversations }),
      onRehydrateStorage: () => (state) => {
        state?.["hasHydrated" as never];
        // Mark hydration complete on next tick so subscribers re-render.
        if (state) {
          setTimeout(() => {
            useConversationsStore.setState({ hasHydrated: true });
          }, 0);
        }
      },
    }
  )
);

export function deriveTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New chat";
  const text = firstUser.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .trim();
  if (!text) return "New chat";
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

export function listConversationsSorted(
  state: ConversationsState
): StoredConversation[] {
  return Object.values(state.conversations).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
}
