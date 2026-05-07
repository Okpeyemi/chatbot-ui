"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { MODELS, getModel } from "@/lib/ai/models";
import {
  formatOllamaSize,
  useOllamaModels,
} from "@/lib/use-ollama-models";
import { cn } from "@/lib/utils";

type ModelSelectorProps = {
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

const OLLAMA_PREFIX = "ollama:";

export function ModelSelector({
  value,
  onChange,
  className,
}: ModelSelectorProps) {
  const ollama = useOllamaModels();

  // Resolve the visible label: cloud catalogue first, then a matching
  // Ollama tag, fall back to the raw id.
  let label: string;
  if (value.startsWith(OLLAMA_PREFIX)) {
    const tag = value.slice(OLLAMA_PREFIX.length);
    const match = ollama.models.find((m) => m.name === tag);
    label = match ? match.name : tag;
  } else {
    label = getModel(value)?.label ?? "Select model";
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm",
          "text-muted-foreground hover:bg-accent hover:text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          className
        )}
      >
        <span>{label}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-96 w-72 overflow-y-auto">
        <div className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Cloud
        </div>
        {MODELS.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onSelect={() => onChange(m.id)}
            className="flex flex-col items-start gap-0.5"
          >
            <span className="font-medium">{m.label}</span>
            {m.description && (
              <span className="text-xs text-muted-foreground">
                {m.description}
              </span>
            )}
          </DropdownMenuItem>
        ))}

        {ollama.available && ollama.models.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span>Local · Ollama</span>
              <span className="size-1.5 rounded-full bg-emerald-500" aria-label="Ollama detected" />
            </div>
            {ollama.models.map((m) => (
              <DropdownMenuItem
                key={m.id}
                onSelect={() => onChange(m.id)}
                className="flex flex-col items-start gap-0.5"
              >
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-muted-foreground">
                  {[m.parameterSize, formatOllamaSize(m.size)]
                    .filter(Boolean)
                    .join(" · ") || "Local model"}
                </span>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {ollama.available && ollama.models.length === 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 text-xs text-muted-foreground">
              Ollama is running but you haven&apos;t pulled any models. Try
              <code className="mx-1 rounded bg-muted px-1 font-mono">
                ollama pull llama3.2
              </code>
              and reload.
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
