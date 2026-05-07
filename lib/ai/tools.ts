import { tool } from "ai";
import { z } from "zod";
import { searchWeb } from "@/lib/ai/web-search";
import { fetchWebPage } from "@/lib/ai/web-fetch";

/**
 * Lets the model ask the user to pick from a short list of options. The tool
 * has no `execute`: the answer is provided client-side by the user via the
 * ChoicePicker component, then sent back as the next message.
 */
export const presentChoices = tool({
  description:
    "Present a multiple-choice picker above the user's input. Use this when you need a precise answer from a small set of alternatives, instead of asking with free-form text.",
  inputSchema: z.object({
    title: z
      .string()
      .describe("The question to display above the options."),
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

/**
 * Provider-agnostic web search. Uses Tavily when TAVILY_API_KEY is set,
 * otherwise falls back to DuckDuckGo's no-key Instant Answer API.
 */
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
  execute: async ({ query, maxResults }) => {
    return searchWeb(query, maxResults ?? 5);
  },
});

/**
 * Fetch a single web page and return its readable text. The model should call
 * this AFTER `webSearch` when it wants to cite or quote a specific page.
 */
export const webFetch = tool({
  description:
    "Fetch a single web page (http(s)) and return its readable text content. Use this AFTER webSearch when you need to read a specific result in detail before answering. Output is truncated to ~12000 characters.",
  inputSchema: z.object({
    url: z.string().url().describe("Absolute URL of the page to fetch."),
  }),
  execute: async ({ url }) => {
    return fetchWebPage(url);
  },
});

export const tools = {
  presentChoices,
  webSearch,
  webFetch,
};

export type ToolName = keyof typeof tools;
