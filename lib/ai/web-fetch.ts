export type WebFetchOk = {
  ok: true;
  url: string;
  finalUrl: string;
  title?: string;
  contentType: string;
  content: string;
};

export type WebFetchErr = {
  ok: false;
  url: string;
  error: string;
};

const MAX_BYTES = 1.5 * 1024 * 1024; // 1.5 MB hard cap on what we download
const MAX_TEXT_CHARS = 12_000; // What we hand back to the model (truncate)

export async function fetchWebPage(
  url: string
): Promise<WebFetchOk | WebFetchErr> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, url, error: "Invalid URL." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, url, error: "Only http(s) URLs are supported." };
  }

  try {
    const res = await fetch(parsed, {
      redirect: "follow",
      headers: {
        // A reasonable UA so sites don't immediately 403.
        "User-Agent":
          "Mozilla/5.0 (compatible; chatbot-ui/0.1; +https://github.com/Okpeyemi/chatbot-ui)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) {
      return { ok: false, url, error: `HTTP ${res.status}` };
    }

    const contentType = res.headers.get("content-type") ?? "text/plain";

    // Stream-cap the body so a giant page doesn't OOM us.
    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return packageResult(parsed, res.url, contentType, text);
    }
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value.byteLength;
      chunks.push(value);
      if (received >= MAX_BYTES) {
        await reader.cancel();
        break;
      }
    }
    const buf = new Uint8Array(received);
    let offset = 0;
    for (const c of chunks) {
      buf.set(c, offset);
      offset += c.byteLength;
    }
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    return packageResult(parsed, res.url, contentType, text);
  } catch (err) {
    return {
      ok: false,
      url,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function packageResult(
  requested: URL,
  finalUrl: string,
  contentType: string,
  body: string
): WebFetchOk {
  const isHtml = /text\/html|application\/xhtml/i.test(contentType);
  const title = isHtml ? extractTitle(body) : undefined;
  const text = isHtml ? htmlToText(body) : body;
  const truncated = text.length > MAX_TEXT_CHARS;
  return {
    ok: true,
    url: requested.toString(),
    finalUrl,
    title,
    contentType,
    content: truncated
      ? `${text.slice(0, MAX_TEXT_CHARS)}\n\n…[truncated, ${text.length - MAX_TEXT_CHARS} more characters]`
      : text,
  };
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1].trim()) : undefined;
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      // Drop script/style/noscript blocks entirely.
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      // Block-level tags become newlines for readability.
      .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, "\n")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      // Strip remaining tags.
      .replace(/<[^>]+>/g, "")
      // Normalise whitespace.
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}
