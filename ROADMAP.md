# Roadmap

Track of upcoming work, grouped by priority and effort. Items get checked
off as they ship.

## Workflow

- **Quick wins** land on `main` directly, one commit per feature, push after
  each one.
- Once every quick win is on `main`, cut a `feature/power` branch and work
  the **Power features** there. Push regularly so progress is visible.
- **Polish** items are picked opportunistically — open a small PR for each.

---

## Phase 1 — Quick wins (effort: minutes, impact: immediate)

Land on `main`, commit + push per item.

- [ ] **Stop button while streaming** — wire `useChat().stop()` to a button
      in the composer that takes over from the send icon while
      `status === "streaming" | "submitted"`. Esc as a global shortcut.
- [ ] **Voice input** — replace the placeholder mic icon in the composer
      with a real Web Speech API integration (no external key). Pulse the
      icon while recording, push the transcript into the textarea.
- [ ] **Drag & drop** — let the user drop files anywhere on the composer
      (and on the welcome screen) instead of having to click the `+`. Reuse
      the existing `fileToAttached` helper.
- [ ] **Conversation export** — “Download as Markdown” item in the chat
      header / actions menu. AI Elements already ships `messagesToMarkdown`.
- [ ] **Token / cost counter** under the composer, fed by `tokenlens`
      (already in deps). Compute approximate cost from the model registry.

## Phase 2 — Power features (`feature/power` branch)

Bigger pieces, push small steps as you go.

- [ ] **MCP servers (Model Context Protocol)** — *the* differentiator.
  - Real **Settings page** wired into the AccountMenu’s currently-disabled
    “Settings” item (route `/settings`, plus a sub-section
    `/settings/mcp`).
  - Visual UI to add / edit / remove MCP servers: name, transport
    (`stdio` / `sse` / `streamable-http`), URL, headers, env, “Test
    connection” button that lists exposed tools.
  - File-based config alongside the UI: `mcp.json` at the project root,
    same shape as the UI, takes precedence in dev. The Settings UI shows
    “read-only — defined in mcp.json” for those entries.
  - Wire active servers via `experimental_createMCPClient` (AI SDK 6) on
    the route handler so their tools merge with the built-in tools.
  - Persist user-added servers in `localStorage` (`chatbot-ui:mcp`).
- [ ] **Ollama / local models** — `@ai-sdk/openai-compatible` provider
      pointing at `http://localhost:11434`. Auto-detect availability and
      list installed models in the model selector. Zero key, fully local.
- [ ] **Conversation forking** — “Branch from here” action on each message.
      Creates a new conversation that inherits every message up to that
      point, then opens it as a fresh `/c/[id]`.

## Phase 3 — Polish (open PRs as they come)

- [ ] **Personas / system-prompt library** — saved presets ("Senior dev",
      "Math tutor", "LinkedIn writer"…) selectable per chat. Persist in
      `localStorage`.
- [ ] **In-conversation search** — Cmd+F-style overlay that highlights
      matches inside the current chat.
- [ ] **Keyboard shortcuts cheatsheet** — `?` opens a dialog listing every
      shortcut (⌘K, ⌘N, Esc, ↑↓ in picker, ⌘↵ to save edit…).
- [ ] **Pin / star conversations** — surface them at the top of the recents
      list and the search palette.
- [ ] **System prompt per chat** — small disclosure in the chat header.
- [ ] **Print-friendly view** — clean `@media print` styles for sharing.
- [ ] **MCP server marketplace** (later) — curated list of community MCP
      servers, one-click install into the Settings UI.

---

## Done

- Welcome screen clone, multi-provider chat, multimodal upload.
- localStorage persistence + Recents page with search / rename / delete.
- Unified collapsible sidebar with ⌘K command palette.
- Account menu with Language sub-menu.
- Web access (`webSearch` + `webFetch`).
- Tools: `now`, `calculator`, `wikipedia`, `generateImage`, `runCode`.
- Memory (`rememberFact`) re-injected into every system prompt.
- Edit + Copy on user messages, Copy + Regenerate on assistant messages.
- Sonner toasts for stream errors.
- `presentChoices` interactive picker.
