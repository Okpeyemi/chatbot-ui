"use client";

import { type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Settings01Icon,
  Globe02Icon,
  HelpCircleIcon,
  GithubIcon,
  InformationCircleIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUIStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { id: "en-US", label: "English (United States)" },
  { id: "fr-FR", label: "Français (France)" },
  { id: "de-DE", label: "Deutsch (Deutschland)" },
  { id: "hi-IN", label: "हिन्दी (भारत)" },
  { id: "id-ID", label: "Indonesia (Indonesia)" },
  { id: "it-IT", label: "Italiano (Italia)" },
  { id: "ja-JP", label: "日本語 (日本)" },
  { id: "ko-KR", label: "한국어 (대한민국)" },
  { id: "pt-BR", label: "Português (Brasil)" },
  { id: "es-419", label: "Español (Latinoamérica)" },
  { id: "es-ES", label: "Español (España)" },
];

const REPO_URL = "https://github.com/Okpeyemi/chatbot-ui";

type AccountMenuProps = {
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
};

export function AccountMenu({
  children,
  side = "top",
  align = "start",
}: AccountMenuProps) {
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);

  const openExternal = (url: string) =>
    window.open(url, "_blank", "noopener,noreferrer");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent
        side={side}
        align={align}
        sideOffset={8}
        className="w-64"
      >
        <div className="px-2 py-1.5">
          <div className="truncate text-sm font-medium text-foreground">
            Local user
          </div>
          <div className="text-xs text-muted-foreground">Free plan</div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled>
          <HugeiconsIcon icon={Settings01Icon} size={14} strokeWidth={1.75} />
          Settings
          <span className="ml-auto text-[11px] text-muted-foreground">
            ⇧⌘,
          </span>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <HugeiconsIcon icon={Globe02Icon} size={14} strokeWidth={1.75} />
            Language
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className={cn("max-h-80 w-60 overflow-y-auto")}
          >
            {LANGUAGES.map((lang) => {
              const checked = language === lang.id;
              return (
                <DropdownMenuItem
                  key={lang.id}
                  onSelect={() => setLanguage(lang.id)}
                  className="pr-2"
                >
                  <span className="truncate">{lang.label}</span>
                  {checked && (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      size={14}
                      strokeWidth={2}
                      className="ml-auto text-foreground"
                    />
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuItem onSelect={() => openExternal(REPO_URL)}>
          <HugeiconsIcon icon={HelpCircleIcon} size={14} strokeWidth={1.75} />
          Get help
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => openExternal(REPO_URL)}>
          <HugeiconsIcon icon={GithubIcon} size={14} strokeWidth={1.75} />
          GitHub
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={() => openExternal(`${REPO_URL}#readme`)}>
          <HugeiconsIcon
            icon={InformationCircleIcon}
            size={14}
            strokeWidth={1.75}
          />
          About Chatbot UI
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
