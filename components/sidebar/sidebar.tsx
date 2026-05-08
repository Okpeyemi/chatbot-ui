"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  Search01Icon,
  Message01Icon,
  Download01Icon,
  SidebarRight01Icon,
  SidebarLeft01Icon,
  Pin02Icon,
} from "@hugeicons/core-free-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/sidebar/theme-toggle";
import { AccountMenu } from "@/components/sidebar/account-menu";
import { SearchDialog } from "@/components/sidebar/search-dialog";
import { useUIStore } from "@/lib/ui-store";
import { useConversationsStore } from "@/lib/conversations-store";
import { cn } from "@/lib/utils";

type NavItem = {
  icon: typeof PlusSignIcon;
  label: string;
  href?: string;
  onClick?: () => void;
  match?: (pathname: string) => boolean;
  shortcut?: string;
};

export function Sidebar() {
  const expanded = useUIStore((s) => s.sidebarExpanded);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const [searchOpen, setSearchOpen] = useState(false);

  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const activeId = params?.id;

  const conversationsMap = useConversationsStore((s) => s.conversations);
  const { pinned, recents } = useMemo(() => {
    const all = Object.values(conversationsMap);
    const pinnedList = all
      .filter((c) => c.pinnedAt)
      .sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0));
    const restList = all
      .filter((c) => !c.pinnedAt)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 30);
    return { pinned: pinnedList, recents: restList };
  }, [conversationsMap]);

  const navItems: NavItem[] = [
    {
      icon: PlusSignIcon,
      label: "New chat",
      href: "/",
      match: (p) => p === "/",
    },
    {
      icon: Search01Icon,
      label: "Search",
      onClick: () => setSearchOpen(true),
      shortcut: "⌘K",
    },
    {
      icon: Message01Icon,
      label: "Chats",
      href: "/chats",
      match: (p) => p === "/chats" || p.startsWith("/c/"),
    },
  ];

  return (
    <>
      <aside
        className={cn(
          "flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar",
          "transition-[width] duration-200 ease-out",
          expanded ? "w-64" : "w-12"
        )}
      >
        <SidebarHeader expanded={expanded} onToggle={toggleSidebar} />

        <nav
          className={cn(
            "flex flex-col gap-0.5 px-1.5 pb-1",
            !expanded && "items-center"
          )}
        >
          {navItems.map((item) => (
            <NavRow
              key={item.label}
              item={item}
              active={item.match?.(pathname) ?? false}
              expanded={expanded}
            />
          ))}
        </nav>

        {expanded ? (
          <RecentsList
            pinned={pinned}
            recents={recents}
            activeId={activeId}
          />
        ) : (
          <div className="flex-1" />
        )}

        <SidebarFooter expanded={expanded} />
      </aside>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function SidebarHeader({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center px-1.5 pb-2 pt-3",
        expanded ? "justify-between px-3" : "justify-center"
      )}
    >
      {expanded && (
        <Link
          href="/"
          className="font-serif text-base font-medium tracking-tight text-sidebar-foreground"
        >
          Chatbot UI
        </Link>
      )}
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={onToggle}
              aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
              className="flex size-7 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <HugeiconsIcon
                icon={expanded ? SidebarRight01Icon : SidebarLeft01Icon}
                size={20}
                strokeWidth={1.5}
              />
            </button>
          }
        />
        <TooltipContent side="right" sideOffset={8}>
          {expanded ? "Collapse sidebar" : "Expand sidebar"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function NavRow({
  item,
  active,
  expanded,
  badge,
}: {
  item: NavItem;
  active: boolean;
  expanded: boolean;
  badge?: boolean;
}) {
  const expandedClass = cn(
    "flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-sm",
    "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
    "transition-colors",
    active && "bg-sidebar-accent text-sidebar-foreground font-medium"
  );
  const collapsedClass = cn(
    "relative flex size-9 items-center justify-center rounded-md text-sidebar-foreground/70",
    "transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
    active && "bg-sidebar-accent text-sidebar-foreground"
  );
  const expandedInner = (
    <>
      <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.5} />
      <span className="truncate">{item.label}</span>
      {item.shortcut && (
        <span className="ml-auto text-[11px] text-sidebar-foreground/40">
          {item.shortcut}
        </span>
      )}
      {badge && !item.shortcut && (
        <span className="ml-auto size-1.5 rounded-full bg-accent-brand" />
      )}
    </>
  );
  const collapsedInner = (
    <>
      <HugeiconsIcon icon={item.icon} size={20} strokeWidth={1.5} />
      {badge && (
        <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent-brand" />
      )}
    </>
  );

  if (expanded) {
    if (item.href) {
      return (
        <Link href={item.href} className={expandedClass}>
          {expandedInner}
        </Link>
      );
    }
    return (
      <button type="button" onClick={item.onClick} className={expandedClass}>
        {expandedInner}
      </button>
    );
  }

  // Collapsed: tooltip-wrapped icon button or link.
  const trigger = item.href ? (
    <Link
      href={item.href}
      aria-label={item.label}
      className={collapsedClass}
    >
      {collapsedInner}
    </Link>
  ) : (
    <button
      type="button"
      aria-label={item.label}
      onClick={item.onClick}
      className={collapsedClass}
    >
      {collapsedInner}
    </button>
  );

  return (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent side="right" sideOffset={8}>
        {item.label}
        {item.shortcut && (
          <span className="ml-1.5 text-foreground/60">{item.shortcut}</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

type SidebarConversationLike = {
  id: string;
  title: string;
  pinnedAt?: number;
};

function RecentsList({
  pinned,
  recents,
  activeId,
}: {
  pinned: SidebarConversationLike[];
  recents: SidebarConversationLike[];
  activeId?: string;
}) {
  if (pinned.length === 0 && recents.length === 0) {
    return (
      <div className="mt-4 flex-1 px-3 text-xs text-sidebar-foreground/40">
        No conversations yet.
      </div>
    );
  }
  return (
    <div className="mt-4 flex flex-1 flex-col gap-3 overflow-hidden">
      {pinned.length > 0 && (
        <Section
          label="Pinned"
          items={pinned}
          activeId={activeId}
          showPinIcon
        />
      )}
      {recents.length > 0 && (
        <Section label="Recents" items={recents} activeId={activeId} />
      )}
    </div>
  );
}

function Section({
  label,
  items,
  activeId,
  showPinIcon,
}: {
  label: string;
  items: SidebarConversationLike[];
  activeId?: string;
  showPinIcon?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <h3 className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
        {label}
      </h3>
      <ul className="space-y-0.5 overflow-y-auto px-1.5 pb-1">
        {items.map((c) => (
          <li key={c.id}>
            <Link
              href={`/c/${c.id}`}
              className={cn(
                "flex items-center gap-1.5 truncate rounded-md px-2 py-1.5 text-sm",
                "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                "transition-colors",
                c.id === activeId &&
                  "bg-sidebar-accent text-sidebar-foreground font-medium"
              )}
            >
              <span className="min-w-0 flex-1 truncate">{c.title}</span>
              {showPinIcon && (
                <HugeiconsIcon
                  icon={Pin02Icon}
                  size={11}
                  strokeWidth={2}
                  className="shrink-0 text-sidebar-foreground/50"
                />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SidebarFooter({ expanded }: { expanded: boolean }) {
  if (expanded) {
    return (
      <div className="flex items-center gap-2 border-t border-sidebar-border/60 px-2 py-2">
        <AccountMenu side="top" align="start">
          <button
            type="button"
            aria-label="Account"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-sidebar-accent"
          >
            <Avatar className="size-7">
              <AvatarFallback className="bg-sidebar-accent text-xs font-medium text-sidebar-foreground">
                M
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 text-xs leading-tight">
              <span className="block truncate font-medium text-sidebar-foreground">
                You
              </span>
              <span className="block truncate text-sidebar-foreground/60">
                Free plan
              </span>
            </span>
          </button>
        </AccountMenu>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label="Get the app"
                  className="relative flex size-7 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  <HugeiconsIcon
                    icon={Download01Icon}
                    size={16}
                    strokeWidth={1.5}
                  />
                  <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent-brand" />
                </button>
              }
            />
            <TooltipContent side="top" sideOffset={6}>
              Get the app
            </TooltipContent>
          </Tooltip>
          <ThemeToggle />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1 px-1.5 pb-2">
      <ThemeToggle />
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label="Get the app"
              className="relative flex size-9 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <HugeiconsIcon
                icon={Download01Icon}
                size={20}
                strokeWidth={1.5}
              />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent-brand" />
            </button>
          }
        />
        <TooltipContent side="right" sideOffset={8}>
          Get the app
        </TooltipContent>
      </Tooltip>
      <AccountMenu side="right" align="end">
        <button
          type="button"
          aria-label="Account"
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-sidebar-ring"
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-sidebar-accent text-xs font-medium text-sidebar-foreground">
              M
            </AvatarFallback>
          </Avatar>
        </button>
      </AccountMenu>
    </div>
  );
}
