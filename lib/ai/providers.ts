import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { getModel, type ProviderId } from "./models";

export const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";

// Lazy: only built once, on first use of an Ollama model.
let ollamaProvider: ReturnType<typeof createOpenAICompatible> | null = null;
function getOllama() {
  if (!ollamaProvider) {
    ollamaProvider = createOpenAICompatible({
      name: "ollama",
      baseURL: OLLAMA_BASE_URL,
    });
  }
  return ollamaProvider;
}

const factories: Record<ProviderId, (modelId: string) => LanguageModel> = {
  anthropic: (id) => anthropic(id),
  openai: (id) => openai(id),
  google: (id) => google(id),
};

const OLLAMA_PREFIX = "ollama:";

export function resolveModel(modelId: string): LanguageModel {
  // Ollama models live outside the static MODELS catalogue (the user picks
  // from whatever they've `ollama pull`-ed). Route them by prefix.
  if (modelId.startsWith(OLLAMA_PREFIX)) {
    const ollamaModelId = modelId.slice(OLLAMA_PREFIX.length);
    return getOllama()(ollamaModelId);
  }

  const def = getModel(modelId);
  if (!def) {
    throw new Error(`Unknown model id: ${modelId}`);
  }
  const factory = factories[def.providerId];
  return factory(def.providerModelId);
}
