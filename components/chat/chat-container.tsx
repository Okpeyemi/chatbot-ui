"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { WelcomeScreen } from "@/components/chat/welcome-screen";
import { ChatView } from "@/components/chat/chat-view";
import type { SubmitPayload } from "@/components/chat/composer";
import { DEFAULT_MODEL_ID } from "@/lib/ai/models";
import { getOrCreateChat } from "@/lib/chat-store";
import {
  deriveTitle,
  useConversationsStore,
} from "@/lib/conversations-store";
import { useMemoryStore } from "@/lib/memory-store";
import { useMcpStore } from "@/lib/mcp-store";
import {
  getActivePersona,
  usePersonasStore,
} from "@/lib/personas-store";
import {
  conversationToMarkdown,
  downloadString,
  filenameFor,
} from "@/lib/export-markdown";

type ChatContainerProps = {
  initialChatId?: string;
};

export function ChatContainer({ initialChatId }: ChatContainerProps) {
  const router = useRouter();
  const [chatId] = useState(() => initialChatId ?? nanoid());
  const [hasUrl, setHasUrl] = useState(!!initialChatId);

  const stored = useConversationsStore((s) => s.conversations[chatId]);
  const hasHydrated = useConversationsStore((s) => s.hasHydrated);
  const upsertConversation = useConversationsStore(
    (s) => s.upsertConversation
  );

  const memories = useMemoryStore((s) => s.memories);
  const addMemory = useMemoryStore((s) => s.addMemory);
  const memoryTexts = useMemo(() => memories.map((m) => m.text), [memories]);

  const mcpServers = useMcpStore((s) => s.servers);
  const enabledMcpServers = useMemo(
    () => mcpServers.filter((s) => s.enabled),
    [mcpServers]
  );

  const activePersonaPrompt = usePersonasStore((s) => getActivePersona(s).prompt);

  const [modelId, setModelId] = useState(
    stored?.modelId ?? DEFAULT_MODEL_ID
  );

  // Reuse the same Chat instance across remounts so navigating mid-stream
  // doesn't drop the in-flight response. The instance owns its own onFinish
  // (defined in lib/chat-store.ts) which persists to localStorage.
  const chat = useMemo(
    () => getOrCreateChat(chatId, stored?.messages),
    // We intentionally only key on chatId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatId]
  );

  // If the store rehydrates AFTER the chat instance was created with empty
  // messages (refreshing /c/[id] is the canonical case), seed the chat from
  // the persisted snapshot once it becomes available.
  useEffect(() => {
    if (
      hasHydrated &&
      stored &&
      stored.messages.length > 0 &&
      chat.messages.length === 0
    ) {
      chat.messages = stored.messages;
    }
  }, [hasHydrated, stored, chat]);

  // Pick up modelId once the store hydrates (initial useState saw `undefined`).
  useEffect(() => {
    if (hasHydrated && stored && stored.modelId !== modelId) {
      setModelId(stored.modelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    error,
    regenerate,
    addToolOutput,
    stop,
    clearError,
  } = useChat({
    chat,
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Global Esc to stop the in-flight stream — but only when no input is
  // focused (Esc inside the composer or picker should keep its local
  // meaning).
  useEffect(() => {
    if (!isStreaming) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target as HTMLElement | null;
      if (t?.tagName === "TEXTAREA" || t?.tagName === "INPUT") return;
      e.preventDefault();
      stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isStreaming, stop]);

  const handleEditMessage = async (messageId: string, newText: string) => {
    // 1. Make sure the chat instance is in a clean state. If a previous
    //    response was stopped or errored, regenerate would otherwise either
    //    no-op or surface a stale error.
    if (status === "streaming" || status === "submitted") {
      stop();
    }
    clearError();

    // 2. Truncate everything after the edited message, replacing the user
    //    message text in-place. Any file parts the user originally attached
    //    are preserved.
    setMessages((curr) => {
      const idx = curr.findIndex((m) => m.id === messageId);
      if (idx === -1) return curr;
      const original = curr[idx];
      const hadText = original.parts.some((p) => p.type === "text");
      const nextParts = hadText
        ? original.parts.map((p) =>
            p.type === "text" ? { ...p, text: newText } : p
          )
        : [{ type: "text" as const, text: newText }, ...original.parts];
      return [...curr.slice(0, idx), { ...original, parts: nextParts }];
    });

    // 3. Kick off the new assistant response. With the array now ending on
    //    the edited user message, regenerate() (no messageId) keeps the
    //    truncated state and just makes a request.
    try {
      await regenerate({ body: { modelId, memories: memoryTexts, mcpServers: enabledMcpServers, persona: activePersonaPrompt } });
    } catch (err) {
      toast.error("Couldn’t regenerate", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleForkMessage = (messageId: string) => {
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;
    // Take everything up to and including the picked message — that's the
    // shared history the new branch inherits.
    const slice = messages.slice(0, idx + 1);

    // Deep-clone via structuredClone so the new chat owns its own messages
    // array (the live one is mutable in the chat-store).
    const cloned = structuredClone(slice);

    const newId = nanoid();
    upsertConversation({
      id: newId,
      modelId,
      title: deriveTitle(cloned),
    });
    useConversationsStore.getState().saveMessages(newId, cloned);
    toast.success("Branched conversation");
    router.push(`/c/${newId}`);
  };

  // Detect a pending `presentChoices` tool call in the most recent assistant
  // message that hasn't been answered yet.
  const pendingChoice = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      for (const part of m.parts) {
        if (
          part.type === "tool-presentChoices" &&
          (part.state === "input-available" ||
            part.state === "input-streaming")
        ) {
          const input = part.input as
            | {
                title?: string;
                options?: string[];
                allowOther?: boolean;
              }
            | undefined;
          if (input?.title && Array.isArray(input.options)) {
            return {
              toolCallId: part.toolCallId,
              title: input.title,
              options: input.options,
              allowOther: input.allowOther ?? true,
            };
          }
        }
      }
      // Stop at the latest assistant message (older calls are already
      // resolved or not the active prompt).
      break;
    }
    return null;
  }, [messages]);

  const resolveChoice = (chosen: string | null) => {
    if (!pendingChoice) return;
    addToolOutput({
      tool: "presentChoices",
      toolCallId: pendingChoice.toolCallId,
      output: chosen ? { picked: chosen } : { skipped: true },
    });
  };

  const handleChoiceSelect = (choice: string) => {
    resolveChoice(choice);
    // Send the choice as a regular user message so it shows up in the chat
    // history and the assistant can react to it.
    sendMessage(
      { role: "user", parts: [{ type: "text", text: choice }] },
      { body: { modelId, memories: memoryTexts, mcpServers: enabledMcpServers, persona: activePersonaPrompt } }
    );
  };

  const handleChoiceSkip = () => {
    resolveChoice(null);
  };

  // Auto-resolve `rememberFact` tool calls: write the fact to the local memory
  // store, then mark the tool output so the model knows the fact landed.
  useEffect(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return;
    for (const part of last.parts) {
      if (
        part.type === "tool-rememberFact" &&
        part.state === "input-available"
      ) {
        const input = part.input as { fact?: string } | undefined;
        const fact = input?.fact;
        if (!fact) continue;
        const stored = addMemory(fact);
        addToolOutput({
          tool: "rememberFact",
          toolCallId: part.toolCallId,
          output: { saved: true, id: stored.id, fact: stored.text },
        });
      }
    }
  }, [messages, addMemory, addToolOutput]);

  const promoteUrl = () => {
    if (hasUrl) return;
    setHasUrl(true);
    router.replace(`/c/${chatId}`, { scroll: false });
  };

  const handleSubmit = (payload: SubmitPayload) => {
    promoteUrl();

    // If the user typed a free-form reply while a choice picker was open,
    // close it (their text reply wins) before sending.
    if (pendingChoice) {
      resolveChoice(null);
    }

    // Build the user message parts.
    const fileParts = payload.files.map((f) => ({
      type: "file" as const,
      mediaType: f.mediaType,
      filename: f.name,
      url: f.url,
    }));
    const userParts = [
      ...(payload.text
        ? [{ type: "text" as const, text: payload.text }]
        : []),
      ...fileParts,
    ];

    // Make sure the conversation exists in the store with the right modelId
    // and a title derived from this first message.
    const titleFromMessage = (() => {
      if (!payload.text) return undefined;
      return payload.text.length > 60
        ? `${payload.text.slice(0, 57)}…`
        : payload.text;
    })();

    upsertConversation({
      id: chatId,
      modelId,
      title: stored?.title ?? titleFromMessage ?? "New chat",
    });

    sendMessage({ role: "user", parts: userParts }, { body: { modelId, memories: memoryTexts, mcpServers: enabledMcpServers, persona: activePersonaPrompt } });
  };

  // Auto-derive the title from the first assistant exchange if the user
  // started with a non-text message.
  const renameConversation = useConversationsStore((s) => s.renameConversation);
  useEffect(() => {
    if (stored && stored.title === "New chat" && messages.length > 0) {
      const better = deriveTitle(messages);
      if (better !== "New chat") {
        renameConversation(chatId, better);
      }
    }
  }, [stored, messages, chatId, renameConversation]);

  // Surface stream errors as a toast in the top-right corner.
  useEffect(() => {
    if (!error) return;
    toast.error("Something went wrong", {
      description: error.message,
      duration: 6000,
    });
  }, [error]);

  // While arriving on /c/[id]: wait for localStorage to hydrate (and for the
  // seed effect to copy stored messages into the chat instance) before deciding
  // between welcome and chat. Otherwise the welcome screen flashes for one
  // frame on every refresh.
  const isHydratingPersistedChat =
    !!initialChatId &&
    (!hasHydrated ||
      (!!stored && stored.messages.length > 0 && messages.length === 0));

  if (isHydratingPersistedChat) {
    return <div className="size-full" aria-hidden />;
  }

  if (messages.length === 0) {
    return (
      <WelcomeScreen
        modelId={modelId}
        onModelChange={setModelId}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <ChatView
      messages={messages}
      status={status}
      modelId={modelId}
      onModelChange={setModelId}
      onSubmit={handleSubmit}
      onStop={stop}
      onRegenerate={() => regenerate({ body: { modelId, memories: memoryTexts, mcpServers: enabledMcpServers, persona: activePersonaPrompt } })}
      onEditMessage={handleEditMessage}
      onForkMessage={handleForkMessage}
      onDownload={() =>
        downloadString(
          conversationToMarkdown(stored ?? null, messages),
          filenameFor(stored?.title)
        )
      }
      pendingChoice={pendingChoice}
      onChoiceSelect={handleChoiceSelect}
      onChoiceSkip={handleChoiceSkip}
    />
  );
}
