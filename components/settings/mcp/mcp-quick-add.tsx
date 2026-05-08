"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { LinkSquare02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { MCP_REGISTRY, type McpRegistryEntry } from "@/lib/mcp/registry";
import { cn } from "@/lib/utils";

type Props = {
  onPick: (entry: McpRegistryEntry) => void;
};

export function McpQuickAdd({ onPick }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-medium text-foreground">Quick add</h2>
        <p className="text-xs text-muted-foreground">
          Pick one to pre-fill the form. You only need to drop in your
          token / path / connection string and hit “Test connection”.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MCP_REGISTRY.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onPick(entry)}
            className={cn(
              "group flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card/40 p-3 text-left",
              "transition-colors hover:border-border hover:bg-card/80"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">{entry.name}</span>
              <div className="flex items-center gap-1.5">
                {entry.badge && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {entry.badge}
                  </span>
                )}
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  size={14}
                  strokeWidth={2}
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{entry.description}</p>
            <a
              href={entry.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon
                icon={LinkSquare02Icon}
                size={11}
                strokeWidth={1.75}
              />
              Docs
            </a>
          </button>
        ))}
      </div>
    </div>
  );
}
