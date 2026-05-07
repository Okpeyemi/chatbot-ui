import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

// In-memory registry of live `Chat` instances keyed by id. Lets us survive
// React unmounts (e.g. when navigating from `/` to `/c/[id]`) without losing
// in-flight streams or already-rendered messages.
const chats = new Map<string, Chat>();

export function getOrCreateChat(id: string, initialMessages?: UIMessage[]): Chat {
  let chat = chats.get(id);
  if (!chat) {
    chat = new Chat({
      id,
      messages: initialMessages ?? [],
      transport: new DefaultChatTransport({ api: "/api/chat" }),
    });
    chats.set(id, chat);
  }
  return chat;
}
