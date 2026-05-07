import { ChatContainer } from "@/components/chat/chat-container";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ConversationPage({ params }: PageProps) {
  const { id } = await params;
  return <ChatContainer key={id} initialChatId={id} />;
}
