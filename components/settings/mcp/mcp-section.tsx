"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  PencilEdit02Icon,
  Delete02Icon,
  Tick02Icon,
  Cancel01Icon,
  Plug01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useMcpStore, TRANSPORT_LABEL } from "@/lib/mcp-store";
import type { McpServerConfig } from "@/lib/mcp/types";
import type { McpRegistryEntry } from "@/lib/mcp/registry";
import { ServerFormDialog } from "@/components/settings/mcp/server-form-dialog";
import { McpQuickAdd } from "@/components/settings/mcp/mcp-quick-add";
import { cn } from "@/lib/utils";

export function McpSection() {
  const uiServers = useMcpStore((s) => s.servers);
  const toggleServer = useMcpStore((s) => s.toggleServer);
  const removeServer = useMcpStore((s) => s.removeServer);

  const [fileServers, setFileServers] = useState<McpServerConfig[]>([]);
  const [editing, setEditing] = useState<McpServerConfig | null>(null);
  const [creating, setCreating] = useState(false);
  const [template, setTemplate] = useState<McpRegistryEntry | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/mcp/file-config")
      .then((r) => r.json())
      .then((data: { servers: McpServerConfig[] }) => {
        if (alive) setFileServers(data.servers ?? []);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      alive = false;
    };
  }, []);

  const allServers = [...fileServers, ...uiServers];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-normal tracking-tight">
            MCP servers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect Model Context Protocol servers to expose their tools to
            the chat. Entries from <code>mcp.json</code> at the project
            root appear here read-only.
          </p>
        </div>
        <Button
          onClick={() => {
            setTemplate(null);
            setEditing(null);
            setCreating(true);
          }}
          className="shrink-0"
        >
          <HugeiconsIcon icon={PlusSignIcon} size={14} strokeWidth={1.75} />
          Add custom
        </Button>
      </header>

      <McpQuickAdd
        onPick={(entry) => {
          setTemplate(entry);
          setEditing(null);
          setCreating(true);
        }}
      />

      <div className="space-y-3">
        {allServers.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            No MCP servers yet. Add one to make its tools available to the
            assistant.
          </div>
        )}

        {allServers.map((server) => {
          const isFile = server.source === "file";
          return (
            <div
              key={server.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-4",
                !server.enabled && "opacity-60"
              )}
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {server.name}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {TRANSPORT_LABEL[server.transport]}
                  </span>
                  {isFile && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      from mcp.json
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {server.transport === "stdio"
                    ? `${server.command ?? ""}${
                        server.args?.length
                          ? " " + server.args.join(" ")
                          : ""
                      }`
                    : server.url}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  checked={server.enabled}
                  onCheckedChange={(checked) =>
                    !isFile && toggleServer(server.id, checked)
                  }
                  disabled={isFile}
                  aria-label={`Enable ${server.name}`}
                />
                {!isFile && (
                  <>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setEditing(server)}
                      aria-label={`Edit ${server.name}`}
                    >
                      <HugeiconsIcon
                        icon={PencilEdit02Icon}
                        size={14}
                        strokeWidth={1.75}
                      />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        if (
                          confirm(`Remove “${server.name}”? Its tools will no longer be available.`)
                        ) {
                          removeServer(server.id);
                        }
                      }}
                      aria-label={`Remove ${server.name}`}
                      className="text-destructive hover:text-destructive"
                    >
                      <HugeiconsIcon
                        icon={Delete02Icon}
                        size={14}
                        strokeWidth={1.75}
                      />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Legend />

      <ServerFormDialog
        open={creating || !!editing}
        initial={editing}
        template={template}
        onClose={() => {
          setCreating(false);
          setEditing(null);
          setTemplate(null);
        }}
      />
    </div>
  );
}

function Legend() {
  return (
    <div className="rounded-md border border-border/40 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
      <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
        <HugeiconsIcon icon={Plug01Icon} size={12} strokeWidth={1.75} />
        How it works
      </div>
      Each enabled server is connected on every chat request. Its tools
      are namespaced
      <code className="mx-1 rounded bg-muted px-1 font-mono">
        mcp_&lt;server&gt;__&lt;tool&gt;
      </code>
      and merged with the built-in tools. <span className="inline-block">Use the “Test connection” button in the form to verify a config before saving.</span>
      <div className="mt-2 flex items-center gap-3">
        <span className="inline-flex items-center gap-1">
          <HugeiconsIcon
            icon={Tick02Icon}
            size={11}
            strokeWidth={2}
            className="text-emerald-500"
          />
          stored in your browser
        </span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1">
          <HugeiconsIcon
            icon={Cancel01Icon}
            size={11}
            strokeWidth={2}
            className="text-amber-500"
          />
          tokens stay client-side, treat them like local secrets
        </span>
      </div>
    </div>
  );
}
