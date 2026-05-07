export type ProviderId = "anthropic" | "openai" | "google";

export type ModelDefinition = {
  id: string;
  providerId: ProviderId;
  providerModelId: string;
  label: string;
  description?: string;
  supportsImages?: boolean;
  supportsPdf?: boolean;
  supportsReasoning?: boolean;
};

export const MODELS: ModelDefinition[] = [
  {
    id: "claude-sonnet-4-6",
    providerId: "anthropic",
    providerModelId: "claude-sonnet-4-6",
    label: "Sonnet 4.6",
    description: "Anthropic — balanced everyday model",
    supportsImages: true,
    supportsPdf: true,
  },
  {
    id: "claude-opus-4-7",
    providerId: "anthropic",
    providerModelId: "claude-opus-4-7",
    label: "Opus 4.7",
    description: "Anthropic — frontier reasoning",
    supportsImages: true,
    supportsPdf: true,
    supportsReasoning: true,
  },
  {
    id: "claude-haiku-4-5",
    providerId: "anthropic",
    providerModelId: "claude-haiku-4-5-20251001",
    label: "Haiku 4.5",
    description: "Anthropic — fast and cheap",
    supportsImages: true,
  },
  {
    id: "gpt-5",
    providerId: "openai",
    providerModelId: "gpt-5",
    label: "GPT-5",
    description: "OpenAI — flagship",
    supportsImages: true,
  },
  {
    id: "gemini-2.5-pro",
    providerId: "google",
    providerModelId: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    description: "Google — long context, multimodal",
    supportsImages: true,
    supportsPdf: true,
  },
];

export const DEFAULT_MODEL_ID = "claude-sonnet-4-6";

export function getModel(id: string): ModelDefinition | undefined {
  return MODELS.find((m) => m.id === id);
}
