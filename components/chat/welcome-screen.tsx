"use client";

import { useEffect, useRef, useState } from "react";
import {
  SparklesIcon,
  CodeIcon,
  Mortarboard01Icon,
  PencilEdit01Icon,
  Coffee01Icon,
  StarsIcon,
  BotIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Composer,
  type ComposerHandle,
  type SubmitPayload,
} from "@/components/chat/composer";
import { cn } from "@/lib/utils";

type Suggestion = {
  id: string;
  label: string;
  icon: typeof CodeIcon;
  template: string;
};

const SUGGESTIONS: Suggestion[] = [
  {
    id: "code",
    label: "Code",
    icon: CodeIcon,
    template: "Write a ",
  },
  {
    id: "learn",
    label: "Learn",
    icon: Mortarboard01Icon,
    template: "Explain ",
  },
  {
    id: "write",
    label: "Write",
    icon: PencilEdit01Icon,
    template: "Help me write ",
  },
  {
    id: "life",
    label: "Life stuff",
    icon: Coffee01Icon,
    template: "Give me advice on ",
  },
  {
    id: "chatbotui",
    label: "ChatbotUI’s choice",
    icon: StarsIcon,
    template: "Surprise me with ",
  },
];

const GREETINGS = [
  "What’s on your mind?",
  "Ready when you are.",
  "Let’s get something done.",
] as const;

type WelcomeScreenProps = {
  modelId: string;
  onModelChange: (id: string) => void;
  onSubmit: (payload: SubmitPayload) => void;
};

export function WelcomeScreen({
  modelId,
  onModelChange,
  onSubmit,
}: WelcomeScreenProps) {
  const composerRef = useRef<ComposerHandle>(null);

  // Cycle through GREETINGS with a typewriter intro.
  // SSR renders the first phrase fully (a11y + no layout shift); the typewriter
  // takes over once the client mounts.
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typed, setTyped] = useState<string>(GREETINGS[0]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const target = GREETINGS[phraseIndex];
    setTyped("");
    let chars = 0;
    const typeMs = 45;
    const holdMs = 1800;
    const typeId = window.setInterval(() => {
      chars += 1;
      setTyped(target.slice(0, chars));
      if (chars >= target.length) window.clearInterval(typeId);
    }, typeMs);
    const advanceId = window.setTimeout(
      () => {
        setPhraseIndex((i) => (i + 1) % GREETINGS.length);
      },
      target.length * typeMs + holdMs
    );
    return () => {
      window.clearInterval(typeId);
      window.clearTimeout(advanceId);
    };
  }, [phraseIndex, isMounted]);

  return (
    <div className="relative flex h-full w-full flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div />
        <div className="flex items-center gap-1.5 rounded-full border border-border/40 bg-background/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <span>Free plan</span>
          <span aria-hidden>·</span>
          <button
            type="button"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Upgrade
          </button>
        </div>
        <button
          type="button"
          aria-label="Help"
          className="rounded-md p-1.5 text-accent-brand hover:bg-accent"
        >
          <HugeiconsIcon icon={BotIcon} size={20} strokeWidth={1.5} />
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex w-full max-w-2xl flex-col items-center gap-8">
          <h1 className="flex items-center gap-3 font-serif text-4xl font-normal tracking-tight text-foreground">
            <HugeiconsIcon
              icon={SparklesIcon}
              size={28}
              strokeWidth={1.5}
              className="animate-sparkle text-accent-brand"
            />
            <span aria-live="polite">
              {typed}
              <span
                aria-hidden
                className="ml-0.5 inline-block w-0.5 -translate-y-0.5 bg-current align-baseline animate-caret h-[0.85em]"
              />
            </span>
          </h1>

          <Composer
            ref={composerRef}
            modelId={modelId}
            onModelChange={onModelChange}
            onSubmit={onSubmit}
            autoFocus
          />

          <div className="flex flex-wrap items-center justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => composerRef.current?.setValue(s.template)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40",
                  "px-3.5 py-1.5 text-sm text-foreground/80",
                  "hover:border-border hover:bg-card/80 hover:text-foreground transition-colors"
                )}
              >
                <HugeiconsIcon icon={s.icon} size={16} strokeWidth={1.5} />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
