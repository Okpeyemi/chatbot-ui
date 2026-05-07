"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { MODELS, getModel } from "@/lib/ai/models";
import { cn } from "@/lib/utils";

type ModelSelectorProps = {
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

export function ModelSelector({
  value,
  onChange,
  className,
}: ModelSelectorProps) {
  const current = getModel(value);

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
        <span>{current?.label ?? "Select model"}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Choose a model
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
