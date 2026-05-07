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
```

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
