import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { resolveModel } from "@/lib/ai/providers";
import { DEFAULT_MODEL_ID } from "@/lib/ai/models";

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
      "You are a helpful, concise assistant running inside an open-source chatbot UI. Use Markdown for code, lists, and formatting.",
    messages: modelMessages,
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
