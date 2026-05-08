"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Copy01Icon,
  CopyCheckIcon,
  RefreshIcon,
  PencilEdit02Icon,
  GitBranchIcon,
} from "@hugeicons/core-free-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n\n");
}

type MessageActionsProps = {
  message: UIMessage;
  canRegenerate?: boolean;
  onRegenerate?: () => void;
  canEdit?: boolean;
  onEdit?: () => void;
  canFork?: boolean;
  onFork?: () => void;
  align?: "start" | "end";
};

export function MessageActions({
  message,
  canRegenerate,
  onRegenerate,
  canEdit,
  onEdit,
  canFork,
  onFork,
  align = "start",
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = getMessageText(message);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Clipboard write failed", err);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
        align === "end" && "justify-end"
      )}
    >
      <ActionButton
        label={copied ? "Copied!" : "Copy"}
        onClick={handleCopy}
        icon={copied ? CopyCheckIcon : Copy01Icon}
      />
      {canEdit && onEdit && (
        <ActionButton label="Edit" onClick={onEdit} icon={PencilEdit02Icon} />
      )}
      {canFork && onFork && (
        <ActionButton
          label="Branch from here"
          onClick={onFork}
          icon={GitBranchIcon}
        />
      )}
      {canRegenerate && onRegenerate && (
        <ActionButton
          label="Regenerate"
          onClick={onRegenerate}
          icon={RefreshIcon}
        />
      )}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Copy01Icon;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            onClick={onClick}
            className={cn(
              "rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <HugeiconsIcon icon={icon} size={14} strokeWidth={1.75} />
          </button>
        }
      />
      <TooltipContent side="bottom" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
