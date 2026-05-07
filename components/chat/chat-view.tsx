"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { MessageActions } from "@/components/chat/message-actions";
import Image from "next/image";
import { Composer, type SubmitPayload } from "@/components/chat/composer";
import { ChoicePicker } from "@/components/chat/choice-picker";
import { ToolTrace } from "@/components/chat/tool-trace";
import { Spinner } from "@/components/ui/spinner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Pdf01Icon } from "@hugeicons/core-free-icons";
import type { ChatStatus, UIMessage } from "ai";

export type PendingChoice = {
  toolCallId: string;
  title: string;
  options: string[];
  allowOther: boolean;
};

type ChatViewProps = {
  messages: UIMessage[];
  status: ChatStatus;
  modelId: string;
  onModelChange: (id: string) => void;
  onSubmit: (payload: SubmitPayload) => void;
  onRegenerate?: () => void;
  pendingChoice?: PendingChoice | null;
  onChoiceSelect?: (choice: string) => void;
  onChoiceSkip?: () => void;
};

export function ChatView({
  messages,
  status,
  modelId,
  onModelChange,
  onSubmit,
  onRegenerate,
  pendingChoice,
  onChoiceSelect,
  onChoiceSkip,
}: ChatViewProps) {
  const isStreaming = status === "submitted" || status === "streaming";
  const lastAssistantId = [...messages]
    .reverse()
    .find((m) => m.role === "assistant")?.id;

  return (
    <div className="flex h-full w-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, idx) => {
                  const key = `${message.id}-${idx}`;
                  if (part.type === "text") {
                    return (
                      <MessageResponse key={key}>{part.text}</MessageResponse>
                    );
                  }
                  if (part.type === "reasoning") {
                    return (
                      <details
                        key={key}
                        className="rounded-md border border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
                      >
                        <summary className="cursor-pointer select-none">
                          Reasoning
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap font-mono">
                          {part.text}
                        </pre>
                      </details>
                    );
                  }
                  if (
                    part.type === "tool-webSearch" ||
                    part.type === "tool-webFetch"
                  ) {
                    return <ToolTrace key={key} part={part} />;
                  }
                  if (part.type === "file") {
                    if (part.mediaType?.startsWith("image/")) {
                      return (
                        <Image
                          key={key}
                          src={part.url}
                          alt={part.filename ?? "attachment"}
                          width={384}
                          height={384}
                          className="max-w-sm rounded-lg border border-border/40"
                          unoptimized
                        />
                      );
                    }
                    if (part.mediaType === "application/pdf") {
                      return (
                        <a
                          key={key}
                          href={part.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-md border border-border/40 bg-muted/40 px-3 py-2 text-sm hover:bg-muted"
                        >
                          <HugeiconsIcon
                            icon={Pdf01Icon}
                            size={18}
                            strokeWidth={1.5}
                          />
                          {part.filename ?? "document.pdf"}
                        </a>
                      );
                    }
                    return null;
                  }
                  return null;
                })}
              </MessageContent>
              {message.role === "assistant" && !isStreaming && (
                <MessageActions
                  message={message}
                  canRegenerate={message.id === lastAssistantId && !!onRegenerate}
                  onRegenerate={onRegenerate}
                />
              )}
            </Message>
          ))}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Spinner className="size-4 text-muted-foreground" />
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 pb-6">
        {pendingChoice && onChoiceSelect && onChoiceSkip && (
          <ChoicePicker
            key={pendingChoice.toolCallId}
            title={pendingChoice.title}
            options={pendingChoice.options}
            allowOther={pendingChoice.allowOther}
            onSelect={onChoiceSelect}
            onSkip={onChoiceSkip}
          />
        )}
        <Composer
          modelId={modelId}
          onModelChange={onModelChange}
          onSubmit={onSubmit}
          disabled={isStreaming}
          placeholder={pendingChoice ? "Or reply directly…" : undefined}
          autoFocus
        />
      </div>
    </div>
  );
}
