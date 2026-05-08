"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Cancel01Icon,
  ArrowUp02Icon,
  ArrowDown02Icon,
} from "@hugeicons/core-free-icons";
import { useTextSearch } from "@/lib/use-text-search";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
};

export function ConversationSearch({ open, onClose, containerRef }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { matches, activeIdx, next, prev, supported } = useTextSearch(
    containerRef,
    open ? query : ""
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [open]);

  if (!open) return null;

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) prev();
      else next();
    }
  };

  return (
    <div
      className={cn(
        "absolute right-4 top-3 z-20 flex items-center gap-1 rounded-lg border border-border/60",
        "bg-background/95 px-1.5 py-1 shadow-lg backdrop-blur"
      )}
      role="search"
    >
      <HugeiconsIcon
        icon={Search01Icon}
        size={14}
        strokeWidth={1.75}
        className="ml-1 text-muted-foreground"
      />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Find in conversation"
        className="w-56 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/70"
      />
      <span className="px-1 text-[11px] tabular-nums text-muted-foreground">
        {query.length === 0
          ? "—"
          : matches.length === 0
            ? "0"
            : `${activeIdx + 1} / ${matches.length}`}
      </span>
      <button
        type="button"
        onClick={prev}
        disabled={matches.length === 0}
        aria-label="Previous match"
        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
      >
        <HugeiconsIcon icon={ArrowUp02Icon} size={12} strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={next}
        disabled={matches.length === 0}
        aria-label="Next match"
        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
      >
        <HugeiconsIcon icon={ArrowDown02Icon} size={12} strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close search"
        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
      </button>
      {!supported && (
        <span className="hidden text-[10px] text-amber-500 sm:inline">
          (no highlight)
        </span>
      )}
    </div>
  );
}
