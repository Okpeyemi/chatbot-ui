"use client";

import { useEffect, useRef, useState } from "react";

// Minimal Web Speech API surface (the DOM lib doesn't ship types for it).
type SpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};
type SpeechRecognitionErrorEvent = { error: string; message?: string };
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;
type SpeechWindow = typeof window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as SpeechWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type UseSpeechRecognitionOptions = {
  lang?: string;
  /** Called whenever a new chunk of recognised text is available. */
  onTranscript?: (chunk: string, isFinal: boolean) => void;
  /** Called once when an error makes the session unusable. */
  onError?: (error: string) => void;
};

export type UseSpeechRecognitionReturn = {
  supported: boolean;
  listening: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
};

export function useSpeechRecognition({
  lang,
  onTranscript,
  onError,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  onTranscriptRef.current = onTranscript;
  onErrorRef.current = onError;

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const instance = new Ctor();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang =
      lang ??
      (typeof navigator !== "undefined" ? navigator.language : "en-US") ??
      "en-US";
    instance.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const chunk = result[0].transcript;
        onTranscriptRef.current?.(chunk, result.isFinal);
      }
    };
    instance.onerror = (event) => {
      onErrorRef.current?.(event.error);
      setListening(false);
    };
    instance.onend = () => {
      setListening(false);
    };
    recognitionRef.current = instance;
    return () => {
      instance.onresult = null;
      instance.onerror = null;
      instance.onend = null;
      try {
        instance.abort();
      } catch {
        /* ignored */
      }
      recognitionRef.current = null;
    };
  }, [lang]);

  const start = () => {
    const r = recognitionRef.current;
    if (!r || listening) return;
    try {
      r.start();
      setListening(true);
    } catch (err) {
      onErrorRef.current?.(err instanceof Error ? err.message : String(err));
    }
  };

  const stop = () => {
    const r = recognitionRef.current;
    if (!r || !listening) return;
    try {
      r.stop();
    } catch {
      /* ignored */
    }
    setListening(false);
  };

  const toggle = () => (listening ? stop() : start());

  return { supported, listening, start, stop, toggle };
}
