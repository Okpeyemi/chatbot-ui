"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
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
import { ConversationSearch } from "@/components/chat/conversation-search";
import { ToolTrace } from "@/components/chat/tool-trace";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HugeiconsIcon } from "@hugeicons/react";
import { Pdf01Icon, Download01Icon } from "@hugeicons/core-free-icons";
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
  onStop?: () => void;
  onRegenerate?: () => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onForkMessage?: (messageId: string) => void;
  onDownload?: () => void;
  pendingChoice?: PendingChoice | null;
  onChoiceSelect?: (choice: string) => void;
  onChoiceSkip?: () => void;
};

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n\n");
}

export function ChatView({
  messages,
  status,
  modelId,
  onModelChange,
  onSubmit,
  onStop,
  onRegenerate,
  onEditMessage,
  onForkMessage,
  onDownload,
  pendingChoice,
  onChoiceSelect,
  onChoiceSkip,
}: ChatViewProps) {
  const isStreaming = status === "submitted" || status === "streaming";
  const lastAssistantId = [...messages]
    .reverse()
    .find((m) => m.role === "assistant")?.id;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const conversationRef = useRef<HTMLDivElement>(null);

  // If the message being edited gets removed (e.g. truncated by regenerate),
  // exit edit mode.
  useEffect(() => {
    if (editingId && !messages.some((m) => m.id === editingId)) {
      setEditingId(null);
    }
  }, [messages, editingId]);

  // Cmd/Ctrl + F opens the in-conversation search instead of the browser's
  // native Find. Only when there's actually a conversation to search.
  useEffect(() => {
    if (messages.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [messages.length]);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      {onDownload && messages.length > 0 && (
        <div className="pointer-events-none absolute right-4 top-3 z-10">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={onDownload}
                  aria-label="Download conversation as Markdown"
                  className="pointer-events-auto flex size-8 items-center justify-center rounded-md border border-border/40 bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:bg-background hover:text-foreground"
                >
                  <HugeiconsIcon
                    icon={Download01Icon}
                    size={16}
                    strokeWidth={1.5}
                  />
                </button>
              }
            />
            <TooltipContent side="left" sideOffset={6}>
              Download as Markdown
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      <ConversationSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        containerRef={conversationRef}
      />
      <div ref={conversationRef} className="flex min-h-0 flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
          {messages.map((message) => {
            const isEditing = editingId === message.id;
            return (
            <Message key={message.id} from={message.role}>
              {isEditing && message.role === "user" ? (
                <UserEditor
                  initialText={getMessageText(message)}
                  onCancel={() => setEditingId(null)}
                  onSave={(text) => {
                    onEditMessage?.(message.id, text);
                    setEditingId(null);
                  }}
                />
              ) : (
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
                    part.type === "tool-webFetch" ||
                    part.type === "tool-now" ||
                    part.type === "tool-calculator" ||
                    part.type === "tool-wikipedia" ||
                    part.type === "tool-generateImage" ||
                    part.type === "tool-runCode" ||
                    part.type === "tool-rememberFact" ||
                    part.type === "dynamic-tool"
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
              )}
              {!isEditing && message.role === "assistant" && !isStreaming && (
                <MessageActions
                  message={message}
                  canRegenerate={message.id === lastAssistantId && !!onRegenerate}
                  onRegenerate={onRegenerate}
                  canFork={!!onForkMessage}
                  onFork={() => onForkMessage?.(message.id)}
                />
              )}
              {!isEditing &&
                message.role === "user" &&
                !isStreaming && (
                  <MessageActions
                    align="end"
                    message={message}
                    canEdit={!!onEditMessage}
                    onEdit={() => setEditingId(message.id)}
                    canFork={!!onForkMessage}
                    onFork={() => onForkMessage?.(message.id)}
                  />
                )}
            </Message>
            );
          })}
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
      </div>

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
          onStop={onStop}
          isStreaming={isStreaming}
          conversationMessages={messages}
          placeholder={pendingChoice ? "Or reply directly…" : undefined}
          autoFocus
        />
      </div>
    </div>
  );
}

function UserEditor({
  initialText,
  onSave,
  onCancel,
}: {
  initialText: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialText);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === initialText.trim()) {
      onCancel();
      return;
    }
    onSave(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="ml-auto flex w-full max-w-[95%] flex-col gap-2 rounded-lg border border-border/60 bg-secondary p-2">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={Math.min(8, Math.max(2, value.split("\n").length))}
        className="min-h-16 resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto text-[11px] text-muted-foreground">
          ⌘↵ to save · Esc to cancel
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={submit}>
          Save & resend
        </Button>
      </div>
    </div>
  );
}
