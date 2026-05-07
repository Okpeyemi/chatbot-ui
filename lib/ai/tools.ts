import { tool, experimental_generateImage as generateImage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { evaluate } from "mathjs";
import { nanoid } from "nanoid";
import { searchWeb } from "@/lib/ai/web-search";
import { fetchWebPage } from "@/lib/ai/web-fetch";
import { putImage } from "@/lib/ai/image-store";

// ---------------------------------------------------------------------------
// Client-resolved tools (no `execute`). The UI provides the tool output via
// `addToolOutput` after the user (or the local store) acts on the call.
// ---------------------------------------------------------------------------

export const presentChoices = tool({
  description:
    "Present a multiple-choice picker above the user's input. Use this when you need a precise answer from a small set of alternatives, instead of asking with free-form text.",
  inputSchema: z.object({
    title: z.string().describe("The question to display above the options."),
    options: z
      .array(z.string().min(1).max(80))
      .min(2)
      .max(9)
      .describe("Between 2 and 9 short option labels."),
    allowOther: z
      .boolean()
      .optional()
      .describe(
        "When true (the default), show a 'Something else' fallback that lets the user type their own answer."
      ),
  }),
});

export const rememberFact = tool({
  description:
    "Persist a short, durable fact about the user (preferences, role, recurring context — e.g. 'prefers TypeScript', 'lives in Lyon'). The fact is saved in their browser and re-injected into your system prompt on every future conversation, so use it for things that should survive across chats. Don't store ephemeral or sensitive info.",
  inputSchema: z.object({
    fact: z
      .string()
      .min(3)
      .max(240)
      .describe(
        "A single, self-contained statement about the user, written from the user's perspective when natural (e.g. 'I prefer pnpm over npm')."
      ),
  }),
});

// ---------------------------------------------------------------------------
// Server-side tools (have `execute` — run on the route handler).
// ---------------------------------------------------------------------------

export const webSearch = tool({
  description:
    "Search the web for up-to-date information. Use this whenever the user asks about current events, recent data, prices, news, or anything that may have changed since your training cutoff. Returns a list of results with title, URL and a snippet.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .max(400)
      .describe("A focused, specific search query — the shorter the better."),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("How many results to return (default 5)."),
  }),
  execute: async ({ query, maxResults }) => searchWeb(query, maxResults ?? 5),
});

export const webFetch = tool({
  description:
    "Fetch a single web page (http(s)) and return its readable text content. Use this AFTER webSearch when you need to read a specific result in detail before answering. Output is truncated to ~12000 characters.",
  inputSchema: z.object({
    url: z.string().url().describe("Absolute URL of the page to fetch."),
  }),
  execute: async ({ url }) => fetchWebPage(url),
});

export const now = tool({
  description:
    "Return the current date and time. Always call this when the user's question depends on the current moment (deadlines, age, freshness, day of the week…). Output is ISO 8601 in UTC plus a localised string in the requested timezone.",
  inputSchema: z.object({
    timezone: z
      .string()
      .optional()
      .describe(
        "IANA timezone name (e.g. 'Europe/Paris', 'America/New_York'). Defaults to UTC."
      ),
  }),
  execute: async ({ timezone }) => {
    const date = new Date();
    const tz = timezone ?? "UTC";
    let localised: string;
    try {
      localised = date.toLocaleString("en-US", {
        timeZone: tz,
        dateStyle: "full",
        timeStyle: "long",
      });
    } catch {
      return { ok: false, error: `Unknown timezone: ${tz}` } as const;
    }
    return {
      ok: true,
      isoUtc: date.toISOString(),
      timezone: tz,
      localised,
      epochMs: date.getTime(),
    } as const;
  },
});

export const calculator = tool({
  description:
    "Evaluate a mathematical expression deterministically. Use this for any non-trivial arithmetic, unit conversions, or symbolic math. Supports +, -, *, /, ^, %, parentheses, common functions (sin, cos, log, sqrt…), constants (pi, e), and unit math (e.g. '2 inch to cm').",
  inputSchema: z.object({
    expression: z
      .string()
      .min(1)
      .max(500)
      .describe("The expression to evaluate, e.g. '(12 * 7) / 3 + sqrt(81)'."),
  }),
  execute: async ({ expression }) => {
    try {
      const value = evaluate(expression);
      const stringified =
        value && typeof value === "object" && "toString" in value
          ? (value as { toString: () => string }).toString()
          : String(value);
      return { ok: true, expression, result: stringified } as const;
    } catch (err) {
      return {
        ok: false,
        expression,
        error: err instanceof Error ? err.message : String(err),
      } as const;
    }
  },
});

export const wikipedia = tool({
  description:
    "Look up an encyclopaedic topic on the English Wikipedia. Returns the page summary (~1-2 paragraphs) plus the canonical URL. Prefer this over webSearch for definitions, historical or scientific facts.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .max(200)
      .describe("Title or topic to look up (e.g. 'Marie Curie')."),
  }),
  execute: async ({ query }) => {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/ /g, "_"))}`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "chatbot-ui/0.1 (https://github.com/Okpeyemi/chatbot-ui)",
          Accept: "application/json",
        },
      });
      if (res.status === 404) {
        return { ok: false, query, error: "No Wikipedia page found." } as const;
      }
      if (!res.ok) {
        return { ok: false, query, error: `HTTP ${res.status}` } as const;
      }
      const data = (await res.json()) as {
        title?: string;
        extract?: string;
        content_urls?: { desktop?: { page?: string } };
        thumbnail?: { source?: string };
      };
      return {
        ok: true,
        query,
        title: data.title ?? query,
        summary: data.extract ?? "",
        url: data.content_urls?.desktop?.page ?? null,
        thumbnail: data.thumbnail?.source ?? null,
      } as const;
    } catch (err) {
      return {
        ok: false,
        query,
        error: err instanceof Error ? err.message : String(err),
      } as const;
    }
  },
});

const IMAGE_MODEL_ID = process.env.IMAGE_MODEL_ID ?? "gpt-image-1";
const IMAGE_SIZE = (process.env.IMAGE_SIZE ?? "1024x1024") as
  | "1024x1024"
  | "1024x1792"
  | "1792x1024"
  | "1024x1536"
  | "1536x1024";

export const generateImageTool = tool({
  description:
    "Generate an image from a text prompt. Use this when the user explicitly asks for a picture, illustration, diagram or visual mock. Returns a URL the UI will render inline.",
  inputSchema: z.object({
    prompt: z
      .string()
      .min(3)
      .max(1000)
      .describe("Detailed description of the image to generate."),
    size: z
      .enum(["1024x1024", "1024x1792", "1792x1024", "1024x1536", "1536x1024"])
      .optional()
      .describe(
        "Aspect ratio. Default 1024x1024. Use 1024x1792/1024x1536 for portrait, 1792x1024/1536x1024 for landscape."
      ),
  }),
  execute: async ({ prompt, size }) => {
    if (!process.env.OPENAI_API_KEY) {
      return {
        ok: false,
        prompt,
        error:
          "Image generation requires OPENAI_API_KEY. Set it in .env.local and restart the dev server.",
      } as const;
    }
    try {
      const result = await generateImage({
        model: openai.image(IMAGE_MODEL_ID),
        prompt,
        size: size ?? IMAGE_SIZE,
      });
      const file = result.image;
      const id = nanoid();
      // `file.uint8Array` is the raw bytes; `file.mediaType` is e.g. "image/png".
      putImage(id, {
        data: file.uint8Array,
        mediaType: file.mediaType ?? "image/png",
        prompt,
      });
      return {
        ok: true,
        prompt,
        url: `/api/images/${id}`,
        mediaType: file.mediaType ?? "image/png",
      } as const;
    } catch (err) {
      return {
        ok: false,
        prompt,
        error: err instanceof Error ? err.message : String(err),
      } as const;
    }
  },
});

export const runCode = tool({
  description:
    "Execute Python code in a sandboxed Jupyter-like environment (E2B). Useful for data crunching, plots (matplotlib), one-off scripts, verifying logic or running quick experiments. Stdout, stderr and Jupyter results are returned. Generated image outputs are not currently surfaced.",
  inputSchema: z.object({
    code: z
      .string()
      .min(1)
      .max(20_000)
      .describe(
        "Self-contained Python code. Each call runs in a fresh sandbox — there is no state between calls."
      ),
  }),
  execute: async ({ code }) => {
    if (!process.env.E2B_API_KEY) {
      return {
        ok: false,
        error:
          "Code execution requires E2B_API_KEY. Get one at https://e2b.dev (free tier).",
      } as const;
    }
    let sandbox: Awaited<
      ReturnType<typeof import("@e2b/code-interpreter").Sandbox.create>
    > | null = null;
    try {
      const { Sandbox } = await import("@e2b/code-interpreter");
      sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY });
      const execution = await sandbox.runCode(code);
      const stdout = execution.logs?.stdout?.join("") ?? "";
      const stderr = execution.logs?.stderr?.join("") ?? "";
      const text = execution.text ?? "";
      const errorText = execution.error
        ? `${execution.error.name}: ${execution.error.value}`
        : "";
      return {
        ok: !execution.error,
        stdout,
        stderr,
        result: text,
        error: errorText || undefined,
      } as const;
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      } as const;
    } finally {
      if (sandbox) {
        try {
          await sandbox.kill();
        } catch {
          /* swallow */
        }
      }
    }
  },
});

export const tools = {
  presentChoices,
  rememberFact,
  now,
  calculator,
  wikipedia,
  webSearch,
  webFetch,
  generateImage: generateImageTool,
  runCode,
};

export type ToolName = keyof typeof tools;
