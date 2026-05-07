"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Note01Icon } from "@hugeicons/core-free-icons";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  useConversationsStore,
  type StoredConversation,
} from "@/lib/conversations-store";

type SearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function bucketLabel(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < day) return "Today";
  if (diffMs < 2 * day) return "Yesterday";
  if (diffMs < 7 * day) return "Past week";
  if (diffMs < 30 * day) return "Past month";
  return "Older";
}

const BUCKET_ORDER: Record<string, number> = {
  Today: 0,
  Yesterday: 1,
  "Past week": 2,
  "Past month": 3,
  Older: 4,
};

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const conversationsMap = useConversationsStore((s) => s.conversations);

  const grouped = useMemo(() => {
    const all = Object.values(conversationsMap).sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
    const buckets = new Map<string, StoredConversation[]>();
    for (const c of all) {
      const label = bucketLabel(c.updatedAt);
      const arr = buckets.get(label) ?? [];
      arr.push(c);
      buckets.set(label, arr);
    }
    return Array.from(buckets.entries()).sort(
      ([a], [b]) => (BUCKET_ORDER[a] ?? 99) - (BUCKET_ORDER[b] ?? 99)
    );
  }, [conversationsMap]);

  // Cmd/Ctrl + K to open the search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  const select = (id: string) => {
    onOpenChange(false);
    router.push(`/c/${id}`);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search chats"
      description="Find a conversation by title."
      className="top-[12%] w-[92vw] max-w-275 sm:max-w-275"
    >
      <Command className="bg-transparent">
        <CommandInput placeholder="Search chats and projects" autoFocus />
        <CommandList className="max-h-[60vh]">
          <CommandEmpty>No conversation found.</CommandEmpty>
          {grouped.map(([label, items]) => (
            <CommandGroup key={label} heading={label}>
              {items.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.title} ${c.id}`}
                  onSelect={() => select(c.id)}
                  className="gap-3 px-3 py-2.5"
                >
                  <HugeiconsIcon
                    icon={Note01Icon}
                    size={16}
                    strokeWidth={1.5}
                    className="text-muted-foreground"
                  />
                  <span className="truncate text-sm">{c.title}</span>
                  <CommandShortcut className="ml-auto text-xs">
                    <span className="hidden group-data-selected/command-item:inline">
                      Enter
                    </span>
                    <span className="group-data-selected/command-item:hidden">
                      {label}
                    </span>
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
