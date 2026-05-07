export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export type WebSearchOk = {
  ok: true;
  query: string;
  results: WebSearchResult[];
};

export type WebSearchErr = {
  ok: false;
  query: string;
  error: string;
};

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
};

type TavilyResponse = {
  results?: TavilyResult[];
};

type DuckDuckGoTopic = {
  Result?: string;
  Text?: string;
  FirstURL?: string;
};

type DuckDuckGoResponse = {
  AbstractText?: string;
  AbstractURL?: string;
  Heading?: string;
  RelatedTopics?: DuckDuckGoTopic[];
  Results?: DuckDuckGoTopic[];
};

const TAVILY_ENDPOINT = "https://api.tavily.com/search";
const DDG_ENDPOINT = "https://api.duckduckgo.com/";

export async function searchWeb(
  query: string,
  maxResults = 5
): Promise<WebSearchOk | WebSearchErr> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { ok: false, query, error: "Empty query." };
  }

  const apiKey = process.env.TAVILY_API_KEY;
  if (apiKey) {
    return tavilySearch(trimmed, maxResults, apiKey);
  }
  return duckDuckGoSearch(trimmed, maxResults);
}

async function tavilySearch(
  query: string,
  maxResults: number,
  apiKey: string
): Promise<WebSearchOk | WebSearchErr> {
  try {
    const res = await fetch(TAVILY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: Math.max(1, Math.min(maxResults, 10)),
        search_depth: "basic",
        include_answer: false,
        include_raw_content: false,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        query,
        error: `Tavily ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    const data = (await res.json()) as TavilyResponse;
    const results = (data.results ?? [])
      .map<WebSearchResult>((r) => ({
        title: r.title ?? "",
        url: r.url ?? "",
        snippet: (r.content ?? "").slice(0, 500),
      }))
      .filter((r) => r.url);
    return { ok: true, query, results };
  } catch (err) {
    return {
      ok: false,
      query,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Free, no-key fallback. DuckDuckGo's instant-answer API only returns curated
// "zero-click" results, so it works best for definitions / Wikipedia-style
// queries. For richer results, set TAVILY_API_KEY.
async function duckDuckGoSearch(
  query: string,
  maxResults: number
): Promise<WebSearchOk | WebSearchErr> {
  try {
    const url = new URL(DDG_ENDPOINT);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("no_html", "1");
    url.searchParams.set("skip_disambig", "1");
    const res = await fetch(url.toString());
    if (!res.ok) {
      return {
        ok: false,
        query,
        error: `DuckDuckGo ${res.status}`,
      };
    }
    const data = (await res.json()) as DuckDuckGoResponse;
    const out: WebSearchResult[] = [];

    if (data.AbstractText && data.AbstractURL) {
      out.push({
        title: data.Heading ?? data.AbstractURL,
        url: data.AbstractURL,
        snippet: data.AbstractText,
      });
    }
    const topics = [
      ...(data.Results ?? []),
      ...(data.RelatedTopics ?? []),
    ].filter((t) => t?.FirstURL && t?.Text);
    for (const t of topics) {
      if (out.length >= maxResults) break;
      out.push({
        title: t.Text!.split(" - ")[0] ?? t.Text!,
        url: t.FirstURL!,
        snippet: t.Text!,
      });
    }
    return { ok: true, query, results: out.slice(0, maxResults) };
  } catch (err) {
    return {
      ok: false,
      query,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
