# Chatbot UI

An open-source, self-hostable chatbot interface inspired by Claude.ai — bring
your own model. Built with Next.js 16, the Vercel AI SDK, shadcn/ui + AI
Elements, and Zustand-backed `localStorage` persistence.

## Features

- Welcome screen + chat view with the Claude.ai look (serif title, narrow icon
  sidebar, suggestion chips)
- Streaming responses with Markdown, syntax highlighting, math and Mermaid
  (powered by [Streamdown](https://github.com/vercel/streamdown))
- Multi-provider model picker (Anthropic, OpenAI, Google) — wire any provider
  in `lib/ai/providers.ts`
- Multi-conversation history persisted in `localStorage`, with a sidebar
  (delete, active highlight, time-bucket grouping)
- Multimodal uploads — images and PDFs go straight into the message
- Light / dark theme toggle
- Message actions (copy, regenerate)
- All icons from [HugeIcons](https://hugeicons.com/)

## Quick start

```bash
git clone <your-fork-url> chatbot-ui
cd chatbot-ui
pnpm install
cp .env.example .env.local   # then add at least one provider API key
pnpm dev
```

Open http://localhost:3000.

There is no database — every conversation lives in your browser's
`localStorage`. Each user (and each browser) has their own private history.

## Environment variables

Set the keys for the providers you want to use. You only need the ones for
models you actually select in the UI.

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Optional — enables higher-quality web search (1k req/month free at tavily.com)
TAVILY_API_KEY=tvly-...

# Optional — Python sandbox for the runCode tool (free tier at e2b.dev)
E2B_API_KEY=e2b_...
```

## Local models (Ollama)

Install [Ollama](https://ollama.com), pull a model, and it shows up in the
model selector under **Local · Ollama** with no extra config:

```bash
brew install ollama   # or see ollama.com/download
ollama pull llama3.2
ollama serve          # usually started automatically
```

The app polls `http://localhost:11434` (override with `OLLAMA_BASE_URL`)
and only renders the section when at least one model is installed. Tool
calling works on models that support it (Llama 3.x, Qwen 2.5, Mistral…);
others reply in plain text and the bot still works.

## Tools

All tools live in `lib/ai/tools.ts` and are registered with every
`streamText` call, so swapping models doesn't change what the bot can do.

| Tool | Purpose | Requires |
| ---- | ------- | -------- |
| `presentChoices` | Multiple-choice picker above the input | – (UI only) |
| `rememberFact` | Persist a durable fact about the user (re-injected into every future system prompt) | – (localStorage) |
| `now(timezone?)` | Current date/time in any IANA timezone | – |
| `calculator(expression)` | Deterministic math via [mathjs](https://mathjs.org) | – |
| `wikipedia(query)` | English Wikipedia page summary | – |
| `webSearch(query, maxResults?)` | Web search | `TAVILY_API_KEY` (optional, DDG fallback) |
| `webFetch(url)` | Read one page, returns ~12 k chars of readable text | – |
| `generateImage(prompt, size?)` | Image generation, rendered inline in the chat | `OPENAI_API_KEY` |
| `runCode(code)` | Python in an isolated [E2B](https://e2b.dev) sandbox | `E2B_API_KEY` |

Memories saved via `rememberFact` are scoped to the browser (localStorage,
key `chatbot-ui:memories`). They're sent in every `/api/chat` request body
and prepended to the system prompt.

## Project layout

```
app/
  (chat)/                 route group with the shared sidebar layout
    layout.tsx            sidebar + conversation history
    page.tsx              welcome screen
    c/[id]/page.tsx       existing conversation (id resolved from URL)
  api/chat/route.ts       streamText endpoint (no persistence — UI-only)
components/
  ai-elements/            Vercel AI Elements primitives (Conversation, Message…)
  chat/                   ChatContainer, ChatView, Composer, model selector
  sidebar/                AppSidebar, ConversationHistory, ThemeToggle
  ui/                     shadcn/ui primitives
lib/
  ai/                     model registry + provider resolver
  chat-store.ts           in-memory map of live AI SDK Chat instances
  conversations-store.ts  Zustand store backed by localStorage
  files.ts                attachment helpers
```

## Adding a model

1. Add an entry in `lib/ai/models.ts` (`MODELS` array).
2. Make sure the provider id is supported in `lib/ai/providers.ts` — if not,
   install the matching `@ai-sdk/<provider>` package and register a factory.
3. The new model shows up in the dropdown automatically.

## Where is my data?

Conversations are saved in `localStorage` under the key
`chatbot-ui:conversations`. Clearing your browser data wipes the history.
Conversations are NOT synced across devices or browsers.

If you want server-side persistence (Postgres, SQLite, S3…), replace the
`useConversationsStore` hook in `lib/conversations-store.ts` with calls to a
backend, and implement the matching API routes.

## Deployment

Works on any host that runs Next.js (Vercel, Fly.io, Railway, Render, a VPS,
Docker). Because there is no server-side database, no volume mount is needed.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Vercel AI SDK 6](https://ai-sdk.dev/) + [AI Elements](https://ai-sdk.dev/elements)
- [Zustand](https://github.com/pmndrs/zustand) (state + persist middleware)
- [HugeIcons](https://hugeicons.com/) (free pack)
- [next-themes](https://github.com/pacocoursey/next-themes)

## License

MIT.
