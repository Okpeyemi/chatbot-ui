"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMcpStore, type McpServerInput } from "@/lib/mcp-store";
import { mcpServerConfigSchema, type McpServerConfig } from "@/lib/mcp/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  initial: McpServerConfig | null;
  onClose: () => void;
};

const TRANSPORTS: { id: McpServerConfig["transport"]; label: string }[] = [
  { id: "streamable-http", label: "Streamable HTTP" },
  { id: "sse", label: "SSE (Server-Sent Events)" },
  { id: "stdio", label: "stdio (local subprocess)" },
];

type FormState = {
  name: string;
  enabled: boolean;
  transport: McpServerConfig["transport"];
  url: string;
  headers: string; // "Key: Value" per line
  command: string;
  args: string; // one per line
  env: string; // KEY=value per line
};

const empty: FormState = {
  name: "",
  enabled: true,
  transport: "streamable-http",
  url: "",
  headers: "",
  command: "",
  args: "",
  env: "",
};

function fromConfig(cfg: McpServerConfig): FormState {
  return {
    name: cfg.name,
    enabled: cfg.enabled,
    transport: cfg.transport,
    url: cfg.url ?? "",
    headers: cfg.headers
      ? Object.entries(cfg.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")
      : "",
    command: cfg.command ?? "",
    args: (cfg.args ?? []).join("\n"),
    env: cfg.env
      ? Object.entries(cfg.env)
          .map(([k, v]) => `${k}=${v}`)
          .join("\n")
      : "",
  };
}

function parseHeaders(text: string): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseEnv(text: string): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseArgs(text: string): string[] | undefined {
  const out = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return out.length > 0 ? out : undefined;
}

function buildPayload(form: FormState): McpServerInput {
  const isStdio = form.transport === "stdio";
  return {
    name: form.name.trim(),
    enabled: form.enabled,
    transport: form.transport,
    url: !isStdio ? form.url.trim() : undefined,
    headers: !isStdio ? parseHeaders(form.headers) : undefined,
    command: isStdio ? form.command.trim() : undefined,
    args: isStdio ? parseArgs(form.args) : undefined,
    env: isStdio ? parseEnv(form.env) : undefined,
  };
}

type TestState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "ok"; tools: { name: string; description?: string }[] }
  | { kind: "error"; message: string };

export function ServerFormDialog({ open, initial, onClose }: Props) {
  const addServer = useMcpStore((s) => s.addServer);
  const updateServer = useMcpStore((s) => s.updateServer);
  const [form, setForm] = useState<FormState>(empty);
  const [test, setTest] = useState<TestState>({ kind: "idle" });

  useEffect(() => {
    if (open) {
      setForm(initial ? fromConfig(initial) : empty);
      setTest({ kind: "idle" });
    }
  }, [open, initial]);

  const isStdio = form.transport === "stdio";

  const validation = useMemo(() => {
    const payload = buildPayload(form);
    return mcpServerConfigSchema.safeParse({
      ...payload,
      id: initial?.id ?? "preview",
      source: "ui",
    });
  }, [form, initial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const runTest = async () => {
    if (!validation.success) {
      const first = validation.error.issues[0];
      toast.error("Fix the form first", {
        description: first
          ? `${first.path.join(".")}: ${first.message}`
          : "Invalid config",
      });
      return;
    }
    setTest({ kind: "running" });
    try {
      const res = await fetch("/api/mcp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const data = await res.json();
      if (data.ok) {
        setTest({ kind: "ok", tools: data.tools ?? [] });
      } else {
        setTest({ kind: "error", message: data.error ?? "Unknown error" });
      }
    } catch (err) {
      setTest({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const save = () => {
    if (!validation.success) {
      const first = validation.error.issues[0];
      toast.error("Can’t save", {
        description: first
          ? `${first.path.join(".")}: ${first.message}`
          : "Invalid config",
      });
      return;
    }
    const payload = buildPayload(form);
    if (initial) {
      updateServer(initial.id, payload);
      toast.success("Server updated");
    } else {
      addServer(payload);
      toast.success("Server added");
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? `Edit ${initial.name}` : "Add MCP server"}
          </DialogTitle>
          <DialogDescription>
            Connect a Model Context Protocol server. The bot will discover
            its tools on every chat request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="mcp-name">Name</label>
            <Input
              id="mcp-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. github"
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="mcp-transport">Transport</label>
            <Select
              value={form.transport}
              onValueChange={(v) =>
                set("transport", v as McpServerConfig["transport"])
              }
            >
              <SelectTrigger id="mcp-transport">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSPORTS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isStdio && (
            <>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="mcp-url">URL</label>
                <Input
                  id="mcp-url"
                  type="url"
                  value={form.url}
                  onChange={(e) => set("url", e.target.value)}
                  placeholder="https://your-mcp-server.example.com/mcp"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="mcp-headers">
                  Headers
                  <span className="ml-1 text-xs text-muted-foreground">
                    (one per line, <code>Key: Value</code>)
                  </span>
                </label>
                <Textarea
                  id="mcp-headers"
                  rows={3}
                  value={form.headers}
                  onChange={(e) => set("headers", e.target.value)}
                  placeholder={"Authorization: Bearer ...\nX-Custom: foo"}
                  className="font-mono text-xs"
                />
              </div>
            </>
          )}

          {isStdio && (
            <>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="mcp-command">Command</label>
                <Input
                  id="mcp-command"
                  value={form.command}
                  onChange={(e) => set("command", e.target.value)}
                  placeholder="e.g. npx"
                  className="font-mono text-xs"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="mcp-args">
                  Arguments
                  <span className="ml-1 text-xs text-muted-foreground">
                    (one per line)
                  </span>
                </label>
                <Textarea
                  id="mcp-args"
                  rows={3}
                  value={form.args}
                  onChange={(e) => set("args", e.target.value)}
                  placeholder={"-y\n@modelcontextprotocol/server-filesystem\n/path/to/dir"}
                  className="font-mono text-xs"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="mcp-env">
                  Environment
                  <span className="ml-1 text-xs text-muted-foreground">
                    (one per line, <code>KEY=value</code>)
                  </span>
                </label>
                <Textarea
                  id="mcp-env"
                  rows={3}
                  value={form.env}
                  onChange={(e) => set("env", e.target.value)}
                  placeholder={"GITHUB_TOKEN=ghp_..."}
                  className="font-mono text-xs"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between rounded-md border border-border/40 bg-muted/20 px-3 py-2">
            <label className="text-sm font-medium" htmlFor="mcp-enabled" className="cursor-pointer">
              Enabled
              <span className="ml-2 text-xs text-muted-foreground">
                Disabled servers stay configured but their tools are not
                exposed.
              </span>
            </label>
            <Switch
              id="mcp-enabled"
              checked={form.enabled}
              onCheckedChange={(v) => set("enabled", v)}
            />
          </div>

          <TestBlock state={test} onTest={runTest} />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={runTest}
            disabled={test.kind === "running"}
          >
            {test.kind === "running" ? "Testing…" : "Test connection"}
          </Button>
          <Button type="button" onClick={save}>
            {initial ? "Save changes" : "Add server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TestBlock({
  state,
  onTest,
}: {
  state: TestState;
  onTest: () => void;
}) {
  if (state.kind === "idle") return null;
  if (state.kind === "running") {
    return (
      <div className="rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        Connecting and listing tools…
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <div className="flex items-center gap-1.5 font-medium">
          <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
          Connection failed
        </div>
        <div className="mt-1 font-mono text-[11px] opacity-80">
          {state.message}
        </div>
        <button
          type="button"
          onClick={onTest}
          className="mt-2 underline underline-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-xs text-foreground"
      )}
    >
      <div className="flex items-center gap-1.5 font-medium text-emerald-500">
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          size={12}
          strokeWidth={2}
        />
        Connected · {state.tools.length} tool
        {state.tools.length === 1 ? "" : "s"}
      </div>
      {state.tools.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {state.tools.map((t) => (
            <li key={t.name} className="flex flex-col gap-0.5">
              <code className="font-mono text-[11px]">{t.name}</code>
              {t.description && (
                <span className="text-muted-foreground">{t.description}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
