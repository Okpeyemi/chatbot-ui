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
  } = useChat({
    chat,
  });

  const handleEditMessage = (messageId: string, newText: string) => {
    setMessages((curr) =>
      curr.map((m) => {
        if (m.id !== messageId) return m;
        // Replace the message's text part(s) in-place; preserve any file or
        // other parts the user attached.
        const hadText = m.parts.some((p) => p.type === "text");
        const nextParts = hadText
          ? m.parts.map((p) =>
              p.type === "text" ? { ...p, text: newText } : p
            )
          : [{ type: "text" as const, text: newText }, ...m.parts];
        return { ...m, parts: nextParts };
      })
    );
    regenerate({
      messageId,
      body: { modelId, memories: memoryTexts },
    });
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
      { body: { modelId, memories: memoryTexts } }
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

    sendMessage({ role: "user", parts: userParts }, { body: { modelId, memories: memoryTexts } });
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
      onRegenerate={() => regenerate({ body: { modelId, memories: memoryTexts } })}
      onEditMessage={handleEditMessage}
      pendingChoice={pendingChoice}
      onChoiceSelect={handleChoiceSelect}
      onChoiceSkip={handleChoiceSkip}
    />
  );
}
