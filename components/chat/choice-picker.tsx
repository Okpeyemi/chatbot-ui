"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  ArrowRight02Icon,
  Link02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export type ChoicePickerProps = {
  title: string;
  options: string[];
  allowOther?: boolean;
  onSelect: (choice: string) => void;
  onSkip: () => void;
};

export function ChoicePicker({
  title,
  options,
  allowOther = true,
  onSelect,
  onSkip,
}: ChoicePickerProps) {
  const [active, setActive] = useState(0);
  const total = options.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't intercept while the user is typing in the textarea below.
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "INPUT" ||
        target?.isContentEditable;
      if (e.key === "Escape") {
        onSkip();
        return;
      }
      if (isTyping) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (i + 1) % total);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (i - 1 + total) % total);
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelect(options[active]);
      } else if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < total) {
          e.preventDefault();
          onSelect(options[idx]);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, total, options, onSelect, onSkip]);

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xl backdrop-blur"
      )}
      role="listbox"
      aria-label={title}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onSkip}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.75} />
        </button>
      </div>

      {/* Options */}
      <ul className="py-1">
        {options.map((opt, i) => {
          const isActive = i === active;
          return (
            <li key={`${i}-${opt}`}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => onSelect(opt)}
                aria-selected={isActive}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-foreground/85 hover:bg-accent/60"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded text-[11px] font-medium",
                    isActive
                      ? "bg-foreground/10 text-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {i + 1}
                </span>
                <span className="flex-1 truncate">{opt}</span>
                {isActive && (
                  <HugeiconsIcon
                    icon={ArrowRight02Icon}
                    size={16}
                    strokeWidth={1.75}
                    className="text-foreground/70"
                  />
                )}
              </button>
            </li>
          );
        })}

        {allowOther && (
          <li className="border-t border-border/40 mt-1 pt-1">
            <div className="flex items-center gap-3 px-4 py-2.5">
              <HugeiconsIcon
                icon={Link02Icon}
                size={16}
                strokeWidth={1.75}
                className="text-muted-foreground"
              />
              <span className="flex-1 text-sm text-muted-foreground">
                Something else
              </span>
              <button
                type="button"
                onClick={onSkip}
                className="rounded-md border border-border/60 px-3 py-1 text-xs font-medium text-foreground hover:bg-accent"
              >
                Skip
              </button>
            </div>
          </li>
        )}
      </ul>

      {/* Footer hints */}
      <div className="flex items-center justify-center gap-2 border-t border-border/40 px-4 py-2 text-[11px] text-muted-foreground">
        <kbd className="rounded border border-border/60 bg-muted px-1 font-mono text-[10px]">
          ↑↓
        </kbd>
        to navigate
        <span aria-hidden>·</span>
        <kbd className="rounded border border-border/60 bg-muted px-1 font-mono text-[10px]">
          Enter
        </kbd>
        to select
        <span aria-hidden>·</span>
        <span>or type below</span>
      </div>
    </div>
  );
}
