"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { McpServerConfig, McpTransport } from "@/lib/mcp/types";

export type McpServerInput = Omit<McpServerConfig, "id" | "source">;

type McpState = {
  servers: McpServerConfig[];
  hasHydrated: boolean;
  addServer: (input: McpServerInput) => McpServerConfig;
  updateServer: (id: string, patch: Partial<McpServerInput>) => void;
  toggleServer: (id: string, enabled: boolean) => void;
  removeServer: (id: string) => void;
};

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
} as Storage;

export const useMcpStore = create<McpState>()(
  persist(
    (set, get) => ({
      servers: [],
      hasHydrated: false,
      addServer: (input) => {
        const server: McpServerConfig = {
          ...input,
          id: nanoid(),
          source: "ui",
        };
        set({ servers: [...get().servers, server] });
        return server;
      },
      updateServer: (id, patch) => {
        set({
          servers: get().servers.map((s) =>
            s.id === id ? { ...s, ...patch, source: "ui" } : s
          ),
        });
      },
      toggleServer: (id, enabled) => {
        set({
          servers: get().servers.map((s) =>
            s.id === id ? { ...s, enabled } : s
          ),
        });
      },
      removeServer: (id) => {
        set({ servers: get().servers.filter((s) => s.id !== id) });
      },
    }),
    {
      name: "chatbot-ui:mcp",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage
      ),
      partialize: (state) => ({ servers: state.servers }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          setTimeout(() => {
            useMcpStore.setState({ hasHydrated: true });
          }, 0);
        }
      },
    }
  )
);

export const TRANSPORT_LABEL: Record<McpTransport, string> = {
  "streamable-http": "Streamable HTTP",
  sse: "SSE",
  stdio: "stdio (local subprocess)",
};
