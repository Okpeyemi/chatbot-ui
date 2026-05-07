"use client";

import Image from "next/image";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Globe02Icon,
  Link02Icon,
  Loading03Icon,
  ArrowDown01Icon,
  Tick02Icon,
  Cancel01Icon,
  Clock01Icon,
  Calculator01Icon,
  BookOpen01Icon,
  Image01Icon,
  CodeIcon,
  StarsIcon,
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
  switch (part.type) {
    case "tool-webSearch":
      return <WebSearchTrace part={part} />;
    case "tool-webFetch":
      return <WebFetchTrace part={part} />;
    case "tool-now":
      return <NowTrace part={part} />;
    case "tool-calculator":
      return <CalculatorTrace part={part} />;
    case "tool-wikipedia":
      return <WikipediaTrace part={part} />;
    case "tool-generateImage":
      return <GenerateImageTrace part={part} />;
    case "tool-runCode":
      return <RunCodeTrace part={part} />;
    case "tool-rememberFact":
      return <RememberFactTrace part={part} />;
    default:
      return null;
  }
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

// ---------------------------------------------------------------------------
// Lightweight inline traces for the new tools.
// ---------------------------------------------------------------------------

function InlineBadge({
  icon,
  status,
  children,
}: {
  icon: typeof Clock01Icon;
  status: "running" | "done" | "error";
  children: React.ReactNode;
}) {
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-border/40 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
      <HugeiconsIcon icon={icon} size={14} strokeWidth={1.75} />
      <StatusIcon status={status} />
      <span className="truncate">{children}</span>
    </div>
  );
}

function NowTrace({ part }: { part: ToolPart }) {
  const status = statusOf(part.state);
  const output = part.output as
    | { ok: true; localised: string; timezone: string }
    | { ok: false; error: string }
    | undefined;
  const label =
    status === "running"
      ? "Checking the current time…"
      : output?.ok
        ? `${output.localised} (${output.timezone})`
        : `Time lookup failed${output && "error" in output ? `: ${output.error}` : ""}`;
  return (
    <InlineBadge icon={Clock01Icon} status={status}>
      {label}
    </InlineBadge>
  );
}

function CalculatorTrace({ part }: { part: ToolPart }) {
  const status = statusOf(part.state);
  const input = (part.input ?? {}) as { expression?: string };
  const output = part.output as
    | { ok: true; expression: string; result: string }
    | { ok: false; expression: string; error: string }
    | undefined;
  const label =
    status === "running"
      ? `Computing ${input.expression ?? "…"}`
      : output?.ok
        ? `${output.expression} = ${output.result}`
        : `Calculator error: ${output && "error" in output ? output.error : ""}`;
  return (
    <InlineBadge icon={Calculator01Icon} status={status}>
      {label}
    </InlineBadge>
  );
}

function WikipediaTrace({ part }: { part: ToolPart }) {
  const [open, setOpen] = useState(false);
  const status = statusOf(part.state);
  const input = (part.input ?? {}) as { query?: string };
  const output = part.output as
    | {
        ok: true;
        title: string;
        summary: string;
        url: string | null;
        thumbnail: string | null;
      }
    | { ok: false; query: string; error: string }
    | undefined;
  const label =
    status === "running"
      ? `Looking up “${input.query ?? "…"}” on Wikipedia`
      : output?.ok
        ? `Wikipedia: ${output.title}`
        : `Wikipedia error: ${output && "error" in output ? output.error : ""}`;
  return (
    <div className="rounded-md border border-border/40 bg-muted/30 px-3 py-1.5 text-xs">
      <button
        type="button"
        onClick={() => output?.ok && setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2 text-muted-foreground",
          output?.ok && "hover:text-foreground"
        )}
      >
        <HugeiconsIcon icon={BookOpen01Icon} size={14} strokeWidth={1.75} />
        <StatusIcon status={status} />
        <span className="flex-1 truncate text-left">{label}</span>
        {output?.ok && (
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={12}
            strokeWidth={2}
            className={cn("transition-transform", open ? "rotate-180" : "")}
          />
        )}
      </button>
      {open && output?.ok && (
        <div className="mt-2 space-y-1 pl-1 text-foreground">
          <div className="line-clamp-6 text-xs text-muted-foreground">
            {output.summary}
          </div>
          {output.url && (
            <a
              href={output.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-medium text-foreground hover:underline"
            >
              Open on Wikipedia ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function GenerateImageTrace({ part }: { part: ToolPart }) {
  const status = statusOf(part.state);
  const input = (part.input ?? {}) as { prompt?: string };
  const output = part.output as
    | { ok: true; prompt: string; url: string; mediaType: string }
    | { ok: false; prompt: string; error: string }
    | undefined;

  if (output?.ok) {
    return (
      <figure className="space-y-1.5">
        <Image
          src={output.url}
          alt={output.prompt}
          width={512}
          height={512}
          unoptimized
          className="w-full max-w-md rounded-lg border border-border/40 object-cover"
        />
        <figcaption className="text-[11px] text-muted-foreground">
          Generated · “{output.prompt.slice(0, 120)}{output.prompt.length > 120 ? "…" : ""}”
        </figcaption>
      </figure>
    );
  }

  const label =
    status === "running"
      ? `Generating image: “${input.prompt?.slice(0, 80) ?? "…"}”`
      : `Image generation failed${output && "error" in output ? `: ${output.error}` : ""}`;
  return (
    <InlineBadge icon={Image01Icon} status={status}>
      {label}
    </InlineBadge>
  );
}

function RunCodeTrace({ part }: { part: ToolPart }) {
  const [open, setOpen] = useState(false);
  const status = statusOf(part.state);
  const input = (part.input ?? {}) as { code?: string };
  const output = part.output as
    | { ok: true; stdout: string; stderr: string; result: string; error?: string }
    | { ok: false; error: string }
    | undefined;

  const lineCount = input.code ? input.code.split("\n").length : 0;
  const label =
    status === "running"
      ? `Running ${lineCount || "?"} lines of Python…`
      : output?.ok
        ? `Ran ${lineCount} lines of Python`
        : `Code execution failed`;

  return (
    <div className="rounded-md border border-border/40 bg-muted/30 px-3 py-1.5 text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon icon={CodeIcon} size={14} strokeWidth={1.75} />
        <StatusIcon status={status} />
        <span className="flex-1 truncate text-left">{label}</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={12}
          strokeWidth={2}
          className={cn("transition-transform", open ? "rotate-180" : "")}
        />
      </button>
      {open && (
        <div className="mt-2 space-y-2 text-foreground">
          {input.code && (
            <pre className="max-h-48 overflow-auto rounded bg-background/60 p-2 font-mono text-[11px] leading-relaxed">
              {input.code}
            </pre>
          )}
          {output?.ok && output.stdout && (
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                stdout
              </div>
              <pre className="max-h-40 overflow-auto rounded bg-background/60 p-2 font-mono text-[11px] leading-relaxed">
                {output.stdout}
              </pre>
            </div>
          )}
          {output?.ok && output.stderr && (
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-destructive">
                stderr
              </div>
              <pre className="max-h-40 overflow-auto rounded bg-background/60 p-2 font-mono text-[11px] leading-relaxed text-destructive">
                {output.stderr}
              </pre>
            </div>
          )}
          {output && !output.ok && (
            <div className="text-destructive">{output.error}</div>
          )}
        </div>
      )}
    </div>
  );
}

function RememberFactTrace({ part }: { part: ToolPart }) {
  const status = statusOf(part.state);
  const input = (part.input ?? {}) as { fact?: string };
  const output = part.output as { saved?: boolean; fact?: string } | undefined;
  const fact = output?.fact ?? input.fact ?? "";
  const label =
    status === "running"
      ? "Saving to memory…"
      : output?.saved
        ? `Saved to memory: “${fact}”`
        : `Memory: ${fact}`;
  return (
    <InlineBadge icon={StarsIcon} status={status}>
      {label}
    </InlineBadge>
  );
}
