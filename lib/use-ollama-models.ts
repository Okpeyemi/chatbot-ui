"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  OllamaModel,
  OllamaModelsResponse,
} from "@/app/api/ollama/models/route";

type State = {
  available: boolean;
  models: OllamaModel[];
  baseUrl?: string;
  error?: string;
  loading: boolean;
};

const initial: State = { available: false, models: [], loading: true };

export function useOllamaModels(): State & { refresh: () => void } {
  const [state, setState] = useState<State>(initial);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch("/api/ollama/models", { cache: "no-store" });
      const data: OllamaModelsResponse = await res.json();
      if (data.available) {
        setState({
          available: true,
          models: data.models,
          baseUrl: data.baseUrl,
          loading: false,
        });
      } else {
        setState({
          available: false,
          models: [],
          baseUrl: data.baseUrl,
          error: data.error,
          loading: false,
        });
      }
    } catch (err) {
      setState({
        available: false,
        models: [],
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      });
    }
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return { ...state, refresh };
}

export function formatOllamaSize(bytes?: number): string | undefined {
  if (!bytes) return undefined;
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1024 ** 2;
  return `${Math.round(mb)} MB`;
}
