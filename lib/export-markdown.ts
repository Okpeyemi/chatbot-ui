import type { UIMessage } from "ai";
import type { StoredConversation } from "@/lib/conversations-store";

/**
 * Render a conversation to plain Markdown. Keeps text + reasoning, summarises
 * tool calls, references files / images by name + URL.
 */
export function conversationToMarkdown(
  conversation: Pick<StoredConversation, "title" | "modelId" | "createdAt"> | null,
  messages: UIMessage[]
): string {
  const lines: string[] = [];
  const title = conversation?.title ?? "Conversation";
  lines.push(`# ${title}`, "");
  if (conversation?.modelId) {
    lines.push(`*Model: ${conversation.modelId}*`);
  }
  if (conversation?.createdAt) {
    lines.push(`*Started: ${new Date(conversation.createdAt).toLocaleString()}*`);
  }
  lines.push("");

  for (const message of messages) {
    if (message.role === "system") continue;
    const heading = message.role === "user" ? "## You" : "## Assistant";
    lines.push(heading, "");
    for (const part of message.parts) {
      if (part.type === "text") {
        lines.push(part.text.trim(), "");
      } else if (part.type === "reasoning") {
        lines.push("> **Reasoning**", "");
        lines.push(
          part.text
            .split("\n")
            .map((l) => `> ${l}`)
            .join("\n"),
          ""
        );
      } else if (part.type === "file") {
        const name = part.filename ?? "attachment";
        if (part.mediaType?.startsWith("image/")) {
          lines.push(`![${name}](${part.url})`, "");
        } else {
          lines.push(`📎 [${name}](${part.url})`, "");
        }
      } else if (part.type.startsWith("tool-")) {
        const toolName = part.type.replace(/^tool-/, "");
        lines.push(`*→ Called \`${toolName}\`*`, "");
      }
    }
  }
  return lines.join("\n").trim() + "\n";
}

/**
 * Make a filename suitable for the OS download dialog.
 */
export function filenameFor(title: string | undefined, ext = "md"): string {
  const base = (title ?? "conversation")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${base || "conversation"}.${ext}`;
}

/**
 * Trigger a browser download for a string payload.
 */
export function downloadString(
  content: string,
  filename: string,
  mediaType = "text/markdown;charset=utf-8"
) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mediaType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
