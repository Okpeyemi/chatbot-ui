import type { UIMessage } from "ai";
import { modelMeta } from "tokenlens";
import { getModel } from "@/lib/ai/models";

// Quick char-based estimate. Real tokenizers vary by ~10% but this keeps the
// bundle small and the counter is informational, not billing-grade.
export function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function estimateMessagesTokens(messages: UIMessage[]): number {
  let total = 0;
  for (const m of messages) {
    for (const part of m.parts) {
      if (part.type === "text" || part.type === "reasoning") {
        total += estimateTokens(part.text);
      }
    }
    // Per-message overhead (role, separators, control tokens). Loose
    // approximation across providers.
    total += 4;
  }
  return total;
}

export type ContextInfo = {
  contextMax?: number;
  pricePerTokenIn?: number;
  pricePerTokenOut?: number;
  displayName?: string;
};

export function getContextInfo(modelId: string): ContextInfo {
  const local = getModel(modelId);
  const lookupId = local?.providerModelId ?? modelId;
  const meta = modelMeta(lookupId);
  return {
    contextMax: meta?.maxTokens,
    pricePerTokenIn: meta?.pricePerTokenIn,
    pricePerTokenOut: meta?.pricePerTokenOut,
    displayName: meta?.displayName ?? local?.label,
  };
}

export function formatTokenCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${Math.round(n / 1000)}K`;
}
