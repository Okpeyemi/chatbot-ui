import { OLLAMA_BASE_URL } from "@/lib/ai/providers";

type OllamaTag = {
  name: string;
  size?: number;
  modified_at?: string;
  details?: {
    parameter_size?: string;
    family?: string;
  };
};

export type OllamaModel = {
  /** Internal id including the `ollama:` prefix that resolveModel expects. */
  id: string;
  /** Tag as Ollama exposes it (e.g. "llama3.2:latest"). */
  name: string;
  /** Bytes on disk, when reported. */
  size?: number;
  /** Human param size like "7B" when reported. */
  parameterSize?: string;
};

export type OllamaModelsResponse =
  | { available: true; baseUrl: string; models: OllamaModel[] }
  | { available: false; baseUrl: string; error: string };

// Always evaluated at request time — Ollama may come and go between requests.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // Ollama exposes the OpenAI-compatible API at /v1 and its native tags
  // endpoint at /api/tags. Strip the trailing /v1 if present so we hit the
  // right host either way.
  const root = OLLAMA_BASE_URL.replace(/\/v1\/?$/, "");
  const url = `${root}/api/tags`;
  try {
    const res = await fetch(url, {
      // 1.5 s is enough for a local connection refused to fail fast.
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) {
      return Response.json({
        available: false,
        baseUrl: root,
        error: `HTTP ${res.status}`,
      } satisfies OllamaModelsResponse);
    }
    const data = (await res.json()) as { models?: OllamaTag[] };
    const models: OllamaModel[] = (data.models ?? [])
      .map((m) => ({
        id: `ollama:${m.name}`,
        name: m.name,
        size: m.size,
        parameterSize: m.details?.parameter_size,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return Response.json({
      available: true,
      baseUrl: root,
      models,
    } satisfies OllamaModelsResponse);
  } catch (err) {
    return Response.json({
      available: false,
      baseUrl: root,
      error: err instanceof Error ? err.message : String(err),
    } satisfies OllamaModelsResponse);
  }
}
