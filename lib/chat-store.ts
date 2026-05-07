import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useConversationsStore } from "@/lib/conversations-store";

// In-memory registry of live `Chat` instances keyed by id. Lets us survive
// React unmounts (e.g. when navigating from `/` to `/c/[id]`) without losing
// in-flight streams or already-rendered messages.
const chats = new Map<string, Chat>();

export function getOrCreateChat(
  id: string,
  initialMessages?: UIMessage[]
): Chat {
  const existing = chats.get(id);
  if (existing) return existing;

  const chat: Chat = new Chat({
    id,
    messages: initialMessages ?? [],
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: ({ messages }) => {
      // Persist the latest snapshot to localStorage. Read the action from the
      // store at call-time to avoid stale closures.
      useConversationsStore
        .getState()
        .saveMessages(id, messages as UIMessage[]);
    },
  });
  chats.set(id, chat);
  return chat;
}
