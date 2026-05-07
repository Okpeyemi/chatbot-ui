import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { getModel, type ProviderId } from "./models";

const factories: Record<ProviderId, (modelId: string) => LanguageModel> = {
  anthropic: (id) => anthropic(id),
  openai: (id) => openai(id),
  google: (id) => google(id),
};

export function resolveModel(modelId: string): LanguageModel {
  const def = getModel(modelId);
  if (!def) {
    throw new Error(`Unknown model id: ${modelId}`);
  }
  const factory = factories[def.providerId];
  return factory(def.providerModelId);
}
