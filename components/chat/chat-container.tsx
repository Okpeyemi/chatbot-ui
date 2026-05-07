"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { nanoid } from "nanoid";
import { WelcomeScreen } from "@/components/chat/welcome-screen";
import { ChatView } from "@/components/chat/chat-view";
import type { SubmitPayload } from "@/components/chat/composer";
import { DEFAULT_MODEL_ID } from "@/lib/ai/models";
import { getOrCreateChat } from "@/lib/chat-store";
import {
  deriveTitle,
  useConversationsStore,
} from "@/lib/conversations-store";

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
  const saveMessages = useConversationsStore((s) => s.saveMessages);

  const [modelId, setModelId] = useState(
    stored?.modelId ?? DEFAULT_MODEL_ID
  );

  // Reuse the same Chat instance across remounts so navigating mid-stream
  // doesn't drop the in-flight response. Hydrate from localStorage on first
  // creation.
  const chat = useMemo(
    () => getOrCreateChat(chatId, stored?.messages),
    // We intentionally only key on chatId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatId]
  );

  // If the store rehydrates AFTER the chat instance was created with empty
  // messages (e.g. first paint of `/c/[id]`), seed the chat once.
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

  const { messages, sendMessage, status, error, regenerate } = useChat({
    chat,
    onFinish: () => {
      // Persist the latest messages snapshot to localStorage.
      saveMessages(chatId, chat.messages);
    },
  });

  const promoteUrl = () => {
    if (hasUrl) return;
    setHasUrl(true);
    router.replace(`/c/${chatId}`, { scroll: false });
  };

  const handleSubmit = (payload: SubmitPayload) => {
    promoteUrl();

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

    sendMessage({ role: "user", parts: userParts }, { body: { modelId } });
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
    <>
      <ChatView
        messages={messages}
        status={status}
        modelId={modelId}
        onModelChange={setModelId}
        onSubmit={handleSubmit}
        onRegenerate={() => regenerate({ body: { modelId } })}
      />
      {error && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error.message}
        </div>
      )}
    </>
  );
}
