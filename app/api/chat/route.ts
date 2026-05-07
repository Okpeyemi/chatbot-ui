import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { resolveModel } from "@/lib/ai/providers";
import { DEFAULT_MODEL_ID } from "@/lib/ai/models";
import { tools } from "@/lib/ai/tools";

export const maxDuration = 60;

type ChatRequestBody = {
  messages: UIMessage[];
  modelId?: string;
  system?: string;
};

export async function POST(req: Request) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch (err) {
    console.error("[/api/chat] invalid JSON body", err);
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { messages, modelId = DEFAULT_MODEL_ID, system } = body;

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

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model,
    system:
      system ??
      [
        "You are a helpful, concise assistant running inside an open-source chatbot UI.",
        "Use Markdown for code, lists, and formatting.",
        "",
        "TOOLS:",
        "- `presentChoices` — when you need a precise answer from a small set of alternatives (2 to 9 short options), call this tool instead of asking with free-form text. Provide a clear `title` and short `options`. Set `allowOther` to true unless the answer must be one of the listed options.",
        "- `webSearch` — call this whenever the user asks about current events, recent data, prices, news, or anything that may have changed since your training cutoff. Prefer focused, specific queries.",
        "- `webFetch` — after `webSearch`, call this to read a specific result URL in detail. Cite the source URL in your final answer.",
        "",
        "When you use the web tools, summarise what you found and cite the URLs you relied on.",
      ].join("\n"),
    messages: modelMessages,
    tools,
    // Allow the model to chain tool calls (search → fetch → answer) before
    // closing the response. 8 steps is plenty without runaway.
    stopWhen: stepCountIs(8),
    onError: ({ error }) => {
      console.error("[/api/chat] streamText error:", error);
    },
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("[/api/chat] response stream error:", error);
      return error instanceof Error ? error.message : String(error);
    },
  });
}
