import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { mcpServerConfigSchema, type McpServerConfig } from "./types";

const CONFIG_PATH = resolve(process.cwd(), "mcp.json");

type RawEntry = {
  name?: string;
  enabled?: boolean;
  transport?: string;
  url?: string;
  headers?: Record<string, string>;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
};

type FileShape = {
  // Either a flat array …
  servers?: RawEntry[];
  // … or the same shape Claude Desktop / Cursor use:
  //   { "mcpServers": { "name": { command, args, ... } } }
  mcpServers?: Record<string, RawEntry>;
};

let cached: { mtime: number; servers: McpServerConfig[] } | null = null;

/**
 * Read mcp.json (if any) from the project root and return validated server
 * configs flagged as `source: "file"`. Cached by mtime so we don't hit the
 * disk on every request, refreshes when the file changes.
 */
export async function loadFileMcpServers(): Promise<McpServerConfig[]> {
  let stats;
  try {
    const { stat } = await import("node:fs/promises");
    stats = await stat(CONFIG_PATH);
  } catch {
    cached = null;
    return [];
  }

  if (cached && cached.mtime === stats.mtimeMs) {
    return cached.servers;
  }

  let raw: string;
  try {
    raw = await readFile(CONFIG_PATH, "utf-8");
  } catch {
    return [];
  }

  let parsed: FileShape;
  try {
    parsed = JSON.parse(raw) as FileShape;
  } catch (err) {
    console.error("[mcp] mcp.json is not valid JSON:", err);
    return [];
  }

  const entries: { name: string; raw: RawEntry }[] = [];
  if (Array.isArray(parsed.servers)) {
    for (const e of parsed.servers) {
      if (!e?.name) continue;
      entries.push({ name: e.name, raw: e });
    }
  }
  if (parsed.mcpServers && typeof parsed.mcpServers === "object") {
    for (const [name, raw] of Object.entries(parsed.mcpServers)) {
      entries.push({ name, raw });
    }
  }

  const servers: McpServerConfig[] = [];
  for (const { name, raw: r } of entries) {
    const transport =
      (r.transport as McpServerConfig["transport"]) ??
      (r.url ? "streamable-http" : "stdio");
    const candidate = {
      id: `file:${name}`,
      name,
      enabled: r.enabled ?? true,
      transport,
      url: r.url,
      headers: r.headers,
      command: r.command,
      args: r.args,
      env: r.env,
      source: "file" as const,
    };
    const result = mcpServerConfigSchema.safeParse(candidate);
    if (!result.success) {
      console.error(`[mcp] Skipping "${name}":`, result.error.format());
      continue;
    }
    servers.push(result.data);
  }

  cached = { mtime: stats.mtimeMs, servers };
  return servers;
}
