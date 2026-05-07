import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type ToolSet,
  type UIMessage,
} from "ai";
import { resolveModel } from "@/lib/ai/providers";
import { DEFAULT_MODEL_ID } from "@/lib/ai/models";
import { tools as builtinTools } from "@/lib/ai/tools";
import { loadFileMcpServers } from "@/lib/mcp/file-config";
import { buildMcpToolset, type McpToolset } from "@/lib/mcp/toolset";
import {
  mcpServerConfigSchema,
  type McpServerConfig,
} from "@/lib/mcp/types";

export const maxDuration = 60;

type ChatRequestBody = {
  messages: UIMessage[];
  modelId?: string;
  system?: string;
  memories?: string[];
  mcpServers?: unknown;
};

export async function POST(req: Request) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch (err) {
    console.error("[/api/chat] invalid JSON body", err);
    return new Response("Invalid JSON body", { status: 400 });
  }

  const {
    messages,
    modelId = DEFAULT_MODEL_ID,
    system,
    memories,
    mcpServers: rawMcpServers,
  } = body;

  if (!Array.isArray(messages)) {
    return new Response(
      "Bad request: `messages` must be an array of UI messages.",
      { status: 400 }
    );
  }

  let model;
  try {
    model = resolveModel(modelId);
  } catch (err) {
    console.error("[/api/chat] unknown model id:", modelId, err);
    return new Response(`Unknown model id: ${modelId}`, { status: 400 });
  }

  // ---------------------------------------------------------------------------
  // Resolve the active MCP servers: file-based (mcp.json) + UI-added (request
  // body). File entries always win on id-collision; both must be enabled.
  // ---------------------------------------------------------------------------
  const fileServers = await loadFileMcpServers();
  const uiServers: McpServerConfig[] = Array.isArray(rawMcpServers)
    ? rawMcpServers.flatMap((entry) => {
        const parsed = mcpServerConfigSchema.safeParse(entry);
        if (!parsed.success) {
          console.warn("[/api/chat] dropping invalid MCP server", parsed.error.format());
          return [];
        }
        return [parsed.data];
      })
    : [];

  const mergedById = new Map<string, McpServerConfig>();
  for (const s of uiServers) mergedById.set(s.id, s);
  for (const s of fileServers) mergedById.set(s.id, s); // file overrides ui
  const activeMcpServers = Array.from(mergedById.values()).filter(
    (s) => s.enabled
  );

  // Connect to each server in parallel; failures are logged but don't kill
  // the whole chat — the affected server's tools just won't be available.
  const toolsetResults = await Promise.allSettled(
    activeMcpServers.map(async (cfg) => ({
      cfg,
      toolset: await buildMcpToolset(cfg),
    }))
  );
  const liveToolsets: { cfg: McpServerConfig; toolset: McpToolset }[] = [];
  for (const r of toolsetResults) {
    if (r.status === "fulfilled") {
      liveToolsets.push(r.value);
    } else {
      console.error("[/api/chat] MCP server failed:", r.reason);
    }
  }
  const mcpTools: ToolSet = liveToolsets.reduce<ToolSet>(
    (acc, { toolset }) => ({ ...acc, ...toolset.tools }),
    {}
  );

  const dispose = async () => {
    await Promise.all(liveToolsets.map(({ toolset }) => toolset.dispose()));
  };

  const modelMessages = await convertToModelMessages(messages);

  const baseSystem = [
    "You are a helpful, concise assistant running inside an open-source chatbot UI.",
    "Use Markdown for code, lists, and formatting.",
    "",
    "TOOLS:",
    "- `presentChoices` — when you need a precise answer from a small set of alternatives (2 to 9 short options), call this tool instead of asking with free-form text. Provide a clear `title` and short `options`. Set `allowOther` to true unless the answer must be one of the listed options.",
    "- `rememberFact` — persist a SHORT, durable fact about the user (preferences, role, recurring context). Don't store ephemeral or sensitive info. Use sparingly: only when the user clearly states something worth remembering across conversations.",
    "- `now` — current date/time in a given IANA timezone. Call this whenever the answer depends on the current moment.",
    "- `calculator` — evaluate any non-trivial arithmetic / unit conversion deterministically (don't compute manually).",
    "- `wikipedia` — encyclopaedic lookups (definitions, history, biographies). Prefer this over `webSearch` when the answer is encyclopaedic.",
    "- `webSearch` — current events, prices, news, recent data, anything past your training cutoff. Use focused queries.",
    "- `webFetch` — after `webSearch`, read a specific result URL in detail. Cite the source URL in your final answer.",
    "- `generateImage` — generate an image when the user explicitly asks for one. The UI renders the image inline.",
    "- `runCode` — execute Python in a sandbox for data crunching, plotting, verifying logic. Each call is stateless.",
    "",
    "When you use external tools, summarise what you found and cite the URLs you relied on.",
  ].join("\n");

  const memoryContext =
    memories && memories.length > 0
      ? [
          "",
          "MEMORIES — durable facts the user has previously shared. Treat these as background context; don't repeat them back unless they're directly relevant.",
          ...memories.map((m) => `- ${m}`),
        ].join("\n")
      : "";

  // Brief the model about every connected MCP server's tools so it knows
  // they exist (descriptions only — the actual schema goes through the
  // tool registration).
  const mcpContext = liveToolsets.length
    ? [
        "",
        "EXTERNAL MCP TOOLS — provided by user-configured Model Context Protocol servers. Treat them like any other tool.",
        ...liveToolsets.flatMap(({ cfg, toolset }) =>
          toolset.descriptors.map((d) => {
            const name = `mcp_${cfg.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "_")
              .replace(/^_+|_+$/g, "")
              .slice(0, 32)}__${d.name}`;
            return `- \`${name}\` — ${d.description ?? "(no description)"}`;
          })
        ),
      ].join("\n")
    : "";

  try {
    const result = streamText({
      model,
      system: (system ?? baseSystem) + memoryContext + mcpContext,
      messages: modelMessages,
      tools: { ...builtinTools, ...mcpTools },
      stopWhen: stepCountIs(8),
      onError: ({ error }) => {
        console.error("[/api/chat] streamText error:", error);
      },
    });

    return result.toUIMessageStreamResponse({
      onFinish: async () => {
        await dispose();
      },
      onError: (error) => {
        console.error("[/api/chat] response stream error:", error);
        return error instanceof Error ? error.message : String(error);
      },
    });
  } catch (err) {
    await dispose();
    throw err;
  }
}
