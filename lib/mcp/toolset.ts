import { dynamicTool, jsonSchema } from "ai";
import type { McpServerConfig } from "./types";

type LooseJsonSchema = Parameters<typeof jsonSchema>[0];
import {
  connectMcpClient,
  listMcpTools,
  type McpToolDescriptor,
} from "./client";

/**
 * Wrap a single MCP server's tools as AI SDK dynamic tools. Returns the
 * merged toolset + a `dispose` to close the underlying transport once the
 * request is done.
 */
export async function buildMcpToolset(cfg: McpServerConfig) {
  const conn = await connectMcpClient(cfg);
  let descriptors: McpToolDescriptor[];
  try {
    descriptors = await listMcpTools(conn.client);
  } catch (err) {
    await conn.close();
    throw err;
  }

  const tools: Record<string, ReturnType<typeof dynamicTool>> = {};
  for (const desc of descriptors) {
    const namespaced = `mcp_${slugify(cfg.name)}__${desc.name}`;
    tools[namespaced] = dynamicTool({
      description:
        desc.description ?? `${desc.name} (from MCP server "${cfg.name}")`,
      inputSchema: jsonSchema(
        (desc.inputSchema as LooseJsonSchema) ?? ({ type: "object" } as LooseJsonSchema)
      ),
      execute: async (input: unknown) => {
        const result = await conn.client.callTool({
          name: desc.name,
          arguments: (input ?? {}) as Record<string, unknown>,
        });
        return result;
      },
    });
  }

  return {
    tools,
    descriptors,
    dispose: () => conn.close(),
  };
}

export type McpToolset = Awaited<ReturnType<typeof buildMcpToolset>>;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}
