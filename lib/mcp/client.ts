import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { McpServerConfig } from "./types";

export type McpToolDescriptor = {
  name: string;
  description?: string;
  inputSchema: unknown;
};

const CONNECT_TIMEOUT_MS = 5000;

function buildTransport(cfg: McpServerConfig): Transport {
  if (cfg.transport === "stdio") {
    if (!cfg.command) throw new Error("stdio transport requires `command`");
    return new StdioClientTransport({
      command: cfg.command,
      args: cfg.args ?? [],
      env: cfg.env,
    });
  }
  if (!cfg.url) {
    throw new Error(`${cfg.transport} transport requires \`url\``);
  }
  const url = new URL(cfg.url);
  if (cfg.transport === "sse") {
    return new SSEClientTransport(url, {
      requestInit: cfg.headers ? { headers: cfg.headers } : undefined,
    });
  }
  return new StreamableHTTPClientTransport(url, {
    requestInit: cfg.headers ? { headers: cfg.headers } : undefined,
  });
}

export type McpConnection = {
  client: Client;
  close: () => Promise<void>;
};

export async function connectMcpClient(
  cfg: McpServerConfig
): Promise<McpConnection> {
  const transport = buildTransport(cfg);
  const client = new Client(
    {
      name: "chatbot-ui",
      version: "0.1.0",
    },
    { capabilities: {} }
  );

  await Promise.race([
    client.connect(transport),
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `MCP server "${cfg.name}" did not respond within ${CONNECT_TIMEOUT_MS}ms`
            )
          ),
        CONNECT_TIMEOUT_MS
      )
    ),
  ]);

  return {
    client,
    close: async () => {
      try {
        await client.close();
      } catch {
        /* ignored */
      }
    },
  };
}

export async function listMcpTools(
  client: Client
): Promise<McpToolDescriptor[]> {
  const result = await client.listTools();
  return result.tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));
}
