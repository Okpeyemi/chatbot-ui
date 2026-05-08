"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  PlusSignIcon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  Delete02Icon,
  Download01Icon,
  PinIcon,
  PinOffIcon,
  Pin02Icon,
} from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useConversationsStore,
  type StoredConversation,
} from "@/lib/conversations-store";
import {
  conversationToMarkdown,
  downloadString,
  filenameFor,
} from "@/lib/export-markdown";
import { cn } from "@/lib/utils";

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatRelative(timestamp: number): string {
  const diff = (timestamp - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 604800) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 2419200) return rtf.format(Math.round(diff / 604800), "week");
  return new Date(timestamp).toLocaleDateString();
}

export function RecentChats() {
  const [query, setQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<StoredConversation | null>(
    null
  );
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StoredConversation | null>(
    null
  );

  const conversationsMap = useConversationsStore((s) => s.conversations);
  const hasHydrated = useConversationsStore((s) => s.hasHydrated);
  const renameConversation = useConversationsStore(
    (s) => s.renameConversation
  );
  const deleteConversation = useConversationsStore(
    (s) => s.deleteConversation
  );
  const togglePin = useConversationsStore((s) => s.togglePin);

  const { pinned, recents } = useMemo(() => {
    const all = Object.values(conversationsMap);
    const q = query.trim().toLowerCase();
    const matches = q
      ? all.filter((c) => c.title.toLowerCase().includes(q))
      : all;
    const pinnedList = matches
      .filter((c) => c.pinnedAt)
      .sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0));
    const restList = matches
      .filter((c) => !c.pinnedAt)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return { pinned: pinnedList, recents: restList };
  }, [conversationsMap, query]);

  const total = pinned.length + recents.length;

  const openRename = (c: StoredConversation) => {
    setRenameTarget(c);
    setRenameValue(c.title);
  };
  const submitRename = () => {
    if (!renameTarget) return;
    const next = renameValue.trim();
    if (next && next !== renameTarget.title) {
      renameConversation(renameTarget.id, next);
    }
    setRenameTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteConversation(deleteTarget.id);
    setDeleteTarget(null);
  };

  const renderRow = (c: StoredConversation) => {
    const isPinned = !!c.pinnedAt;
    return (
      <li key={c.id} className="group/row relative">
        <Link
          href={`/c/${c.id}`}
          className={cn(
            "flex items-center justify-between gap-4 rounded-md px-2 py-3",
            "hover:bg-card/60 transition-colors"
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-foreground">
            {isPinned && (
              <HugeiconsIcon
                icon={Pin02Icon}
                size={11}
                strokeWidth={2}
                className="shrink-0 text-muted-foreground"
              />
            )}
            <span className="min-w-0 truncate">{c.title}</span>
          </span>
          <span
            className={cn(
              "shrink-0 text-xs text-muted-foreground transition-transform duration-150",
              "group-hover/row:-translate-x-8 group-focus-within/row:-translate-x-8"
            )}
          >
            {formatRelative(c.updatedAt)}
          </span>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label={`Actions for ${c.title}`}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5",
                  "text-muted-foreground opacity-0 transition-opacity",
                  "hover:bg-accent hover:text-foreground",
                  "group-hover/row:opacity-100 focus:opacity-100"
                )}
              >
                <HugeiconsIcon
                  icon={MoreHorizontalIcon}
                  size={16}
                  strokeWidth={2}
                />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => togglePin(c.id)}>
              <HugeiconsIcon
                icon={isPinned ? PinOffIcon : PinIcon}
                size={14}
                strokeWidth={1.75}
              />
              {isPinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openRename(c)}>
              <HugeiconsIcon
                icon={PencilEdit02Icon}
                size={14}
                strokeWidth={1.75}
              />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                downloadString(
                  conversationToMarkdown(c, c.messages),
                  filenameFor(c.title)
                )
              }
            >
              <HugeiconsIcon
                icon={Download01Icon}
                size={14}
                strokeWidth={1.75}
              />
              Download as Markdown
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteTarget(c)}
              className="text-destructive focus:text-destructive"
            >
              <HugeiconsIcon
                icon={Delete02Icon}
                size={14}
                strokeWidth={1.75}
              />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </li>
    );
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-6 py-10">
      <header className="flex items-center justify-between pb-6">
        <h1 className="font-serif text-3xl font-normal tracking-tight">
          Chats
        </h1>
        <Link
          href="/"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90 transition-colors"
          )}
        >
          <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={1.75} />
          New chat
        </Link>
      </header>

      <div className="relative pb-4">
        <HugeiconsIcon
          icon={Search01Icon}
          size={16}
          strokeWidth={1.5}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-[calc(50%+0.5rem)] text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats…"
          className="h-11 rounded-lg border-border/60 bg-card/40 pl-9 text-base"
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {hasHydrated && total === 0 && (
          <p className="px-1 py-8 text-center text-sm text-muted-foreground">
            {query
              ? `No chat matches “${query}”.`
              : "No conversations yet. Start one from the home screen."}
          </p>
        )}

        {pinned.length > 0 && (
          <section className="mb-4">
            <h2 className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Pinned
            </h2>
            <ul className="divide-y divide-border/40">{pinned.map(renderRow)}</ul>
          </section>
        )}
        {recents.length > 0 && (
          <section>
            {pinned.length > 0 && (
              <h2 className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                All chats
              </h2>
            )}
            <ul className="divide-y divide-border/40">{recents.map(renderRow)}</ul>
          </section>
        )}
      </div>

      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
            <DialogDescription>
              Choose a new title for this conversation.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitRename();
              }
            }}
            placeholder="Chat title"
            autoFocus
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRenameTarget(null)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={submitRename}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chat?</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.title}” will be removed from your history. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
