"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Globe02Icon,
  Link02Icon,
  Loading03Icon,
  ArrowDown01Icon,
  Tick02Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

type ToolPart = {
  type: string;
  toolCallId?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

type WebSearchInput = { query?: string; maxResults?: number };
type WebSearchOutput =
  | {
      ok: true;
      query: string;
      results: { title: string; url: string; snippet: string }[];
    }
  | { ok: false; query: string; error: string };

type WebFetchInput = { url?: string };
type WebFetchOutput =
  | {
      ok: true;
      url: string;
      finalUrl: string;
      title?: string;
      content: string;
    }
  | { ok: false; url: string; error: string };

export function ToolTrace({ part }: { part: ToolPart }) {
  if (part.type === "tool-webSearch") {
    return <WebSearchTrace part={part} />;
  }
  if (part.type === "tool-webFetch") {
    return <WebFetchTrace part={part} />;
  }
  return null;
}

function statusOf(state?: string): "running" | "done" | "error" {
  if (state === "output-available") return "done";
  if (state === "output-error") return "error";
  return "running";
}

function StatusIcon({ status }: { status: "running" | "done" | "error" }) {
  if (status === "running") {
    return (
      <HugeiconsIcon
        icon={Loading03Icon}
        size={14}
        strokeWidth={1.75}
        className="animate-spin text-muted-foreground"
      />
    );
  }
  if (status === "error") {
    return (
      <HugeiconsIcon
        icon={Cancel01Icon}
        size={14}
        strokeWidth={1.75}
        className="text-destructive"
      />
    );
  }
  return (
    <HugeiconsIcon
      icon={Tick02Icon}
      size={14}
      strokeWidth={1.75}
      className="text-accent-brand"
    />
  );
}

function WebSearchTrace({ part }: { part: ToolPart }) {
  const [open, setOpen] = useState(false);
  const status = statusOf(part.state);
  const input = (part.input ?? {}) as WebSearchInput;
  const output = part.output as WebSearchOutput | undefined;
  const query = input.query ?? (output && "query" in output ? output.query : "");
  const ok = output?.ok === true;
  const results = ok ? output.results : [];

  const label =
    status === "running"
      ? query
        ? `Searching the web for “${query}”…`
        : "Searching the web…"
      : ok
        ? `Searched “${query}” · ${results.length} result${results.length === 1 ? "" : "s"}`
        : `Search failed: ${output && "error" in output ? output.error : part.errorText ?? "unknown error"}`;

  return (
    <div className="rounded-md border border-border/40 bg-muted/30 px-3 py-1.5 text-xs">
      <button
        type="button"
        onClick={() => ok && results.length > 0 && setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2 text-muted-foreground",
          ok && results.length > 0 && "hover:text-foreground"
        )}
        aria-expanded={open}
      >
        <HugeiconsIcon icon={Globe02Icon} size={14} strokeWidth={1.75} />
        <StatusIcon status={status} />
        <span className="flex-1 truncate text-left">{label}</span>
        {ok && results.length > 0 && (
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={12}
            strokeWidth={2}
            className={cn(
              "transition-transform",
              open ? "rotate-180" : "rotate-0"
            )}
          />
        )}
      </button>
      {open && ok && results.length > 0 && (
        <ol className="mt-2 space-y-1.5 pl-1">
          {results.map((r, i) => (
            <li key={`${i}-${r.url}`} className="text-xs">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:underline"
              >
                {r.title || r.url}
              </a>
              <div className="text-muted-foreground/80 truncate">
                {r.url}
              </div>
              {r.snippet && (
                <div className="mt-0.5 text-muted-foreground line-clamp-2">
                  {r.snippet}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function WebFetchTrace({ part }: { part: ToolPart }) {
  const status = statusOf(part.state);
  const input = (part.input ?? {}) as WebFetchInput;
  const output = part.output as WebFetchOutput | undefined;
  const url = input.url ?? (output && "url" in output ? output.url : "");
  const title =
    output?.ok && output.title
      ? output.title
      : url
        ? safeHostname(url)
        : "page";

  const label =
    status === "running"
      ? `Reading ${url ? safeHostname(url) : "page"}…`
      : output?.ok
        ? `Read ${title}`
        : `Fetch failed${output && "error" in output ? `: ${output.error}` : ""}`;

  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-md border border-border/40 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <HugeiconsIcon icon={Link02Icon} size={14} strokeWidth={1.75} />
      <StatusIcon status={status} />
      <span className="truncate">{label}</span>
    </a>
  );
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
