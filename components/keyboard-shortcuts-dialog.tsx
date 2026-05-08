"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Shortcut = { keys: string[]; label: string };
type Group = { title: string; items: Shortcut[] };

const GROUPS: Group[] = [
  {
    title: "Global",
    items: [
      { keys: ["⌘", "K"], label: "Open the search palette" },
      { keys: ["?"], label: "Show this cheatsheet" },
      { keys: ["Esc"], label: "Close the active dialog / stop streaming" },
    ],
  },
  {
    title: "Composer",
    items: [
      { keys: ["Enter"], label: "Send the message" },
      { keys: ["Shift", "Enter"], label: "Insert a new line" },
      { keys: ["⌘", "↵"], label: "Save & resend (when editing a message)" },
    ],
  },
  {
    title: "In a conversation",
    items: [
      { keys: ["⌘", "F"], label: "Find inside the current chat" },
      { keys: ["Enter"], label: "Next match · Shift+Enter for previous" },
    ],
  },
  {
    title: "Choice picker",
    items: [
      { keys: ["↑", "↓"], label: "Navigate options" },
      { keys: ["Enter"], label: "Pick the highlighted option" },
      { keys: ["1", "…", "9"], label: "Pick by number" },
      { keys: ["Esc"], label: "Skip the picker" },
    ],
  },
];

export function KeyboardShortcutsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?" && !(e.shiftKey && e.key === "/")) return;
      const t = e.target as HTMLElement | null;
      // Don't hijack while the user is typing.
      if (
        t?.tagName === "TEXTAREA" ||
        t?.tagName === "INPUT" ||
        t?.isContentEditable
      ) {
        return;
      }
      // Modifier keys other than Shift mean the user is doing something else.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {children}
      <KeyboardShortcutsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Hit{" "}
            <Kbd>?</Kbd> from anywhere outside an input to bring this back.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <span className="text-foreground/85">{item.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {item.keys.map((k, j) => (
                        <Kbd key={j}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border/60 bg-muted px-1.5",
        "font-mono text-[11px] font-medium text-foreground/90 shadow-[inset_0_-1px_0_0_var(--border)]",
        className
      )}
    >
      {children}
    </kbd>
  );
}
