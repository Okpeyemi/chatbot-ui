"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";

export type Persona = {
  id: string;
  name: string;
  prompt: string;
  builtin?: boolean;
};

export const BUILTIN_PERSONAS: Persona[] = [
  {
    id: "default",
    name: "Default",
    prompt: "",
    builtin: true,
  },
  {
    id: "senior-dev",
    name: "Senior dev",
    prompt:
      "You are a senior software engineer. Be concise, precise and opinionated. Prefer real-world tradeoffs over theory. Show code in TypeScript by default unless the user picks another language. Point out hidden costs (performance, maintenance, lock-in) before recommending an approach.",
    builtin: true,
  },
  {
    id: "math-tutor",
    name: "Math tutor",
    prompt:
      "You are a patient math tutor. Break each problem into clear, numbered steps. Explain the *why* behind each step, not just the result. When the user is stuck, prompt them with a leading question instead of giving the answer immediately.",
    builtin: true,
  },
  {
    id: "linkedin-writer",
    name: "LinkedIn writer",
    prompt:
      "You write LinkedIn posts. Open with a hook in the first line, deliver one story or insight in the middle, end with a clear takeaway. Keep paragraphs to 1–2 lines. Avoid emoji unless the user asks. No more than 3 hashtags.",
    builtin: true,
  },
  {
    id: "concise",
    name: "Concise",
    prompt:
      "Reply in the shortest correct answer. No prefaces (\"Sure!\", \"Great question…\"), no recap of the question, no closing summary. If a single word answers it, give one word.",
    builtin: true,
  },
];

type PersonaInput = Omit<Persona, "id" | "builtin">;

type PersonasState = {
  custom: Persona[];
  activeId: string;
  hasHydrated: boolean;
  addPersona: (input: PersonaInput) => Persona;
  updatePersona: (id: string, patch: Partial<PersonaInput>) => void;
  removePersona: (id: string) => void;
  setActive: (id: string) => void;
};

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
} as Storage;

export const usePersonasStore = create<PersonasState>()(
  persist(
    (set, get) => ({
      custom: [],
      activeId: "default",
      hasHydrated: false,
      addPersona: (input) => {
        const persona: Persona = {
          id: nanoid(),
          name: input.name.trim() || "Untitled",
          prompt: input.prompt.trim(),
        };
        set({ custom: [...get().custom, persona] });
        return persona;
      },
      updatePersona: (id, patch) => {
        set({
          custom: get().custom.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...patch,
                  name: patch.name?.trim() || p.name,
                  prompt: patch.prompt?.trim() ?? p.prompt,
                }
              : p
          ),
        });
      },
      removePersona: (id) => {
        const next = get().custom.filter((p) => p.id !== id);
        set({
          custom: next,
          // If the active persona was removed, fall back to Default.
          activeId: get().activeId === id ? "default" : get().activeId,
        });
      },
      setActive: (id) => set({ activeId: id }),
    }),
    {
      name: "chatbot-ui:personas",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage
      ),
      partialize: (state) => ({
        custom: state.custom,
        activeId: state.activeId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          setTimeout(() => {
            usePersonasStore.setState({ hasHydrated: true });
          }, 0);
        }
      },
    }
  )
);

export function getAllPersonas(state: PersonasState): Persona[] {
  return [...BUILTIN_PERSONAS, ...state.custom];
}

export function getActivePersona(state: PersonasState): Persona {
  const all = getAllPersonas(state);
  return all.find((p) => p.id === state.activeId) ?? BUILTIN_PERSONAS[0];
}
