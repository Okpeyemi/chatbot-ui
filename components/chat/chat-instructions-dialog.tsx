"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useConversationsStore } from "@/lib/conversations-store";

type ChatInstructionsDialogProps = {
  chatId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChatInstructionsDialog({
  chatId,
  open,
  onOpenChange,
}: ChatInstructionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[min(95vw,640px)] max-w-[640px] flex-col gap-0 p-0 sm:max-w-[640px]">
        {/* Remount the form whenever the dialog is opened so the textarea
            reflects the latest stored value without a setState-in-effect. */}
        {open && (
          <InstructionsForm
            key={chatId}
            chatId={chatId}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function InstructionsForm({
  chatId,
  onClose,
}: {
  chatId: string;
  onClose: () => void;
}) {
  const stored = useConversationsStore((s) => s.conversations[chatId]);
  const setSystemPrompt = useConversationsStore((s) => s.setSystemPrompt);
  const [value, setValue] = useState(stored?.systemPrompt ?? "");

  const save = () => {
    setSystemPrompt(chatId, value);
    toast.success(
      value.trim() ? "Instructions saved" : "Instructions cleared"
    );
    onClose();
  };

  const clear = () => {
    setSystemPrompt(chatId, undefined);
    toast.success("Instructions cleared");
    onClose();
  };

  return (
    <>
      <DialogHeader className="border-b border-border/40 p-4">
        <DialogTitle>Chat instructions</DialogTitle>
        <DialogDescription>
          Custom guidance for this conversation only. Appended after the
          assistant&rsquo;s base prompt and any active persona.
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto p-4">
        <Textarea
          rows={12}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Always answer in French. Keep code samples under 30 lines."
          className="font-mono text-xs"
          autoFocus
        />
      </div>

      <DialogFooter className="flex items-center justify-between gap-2 border-t border-border/40 p-4 sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={clear}
          disabled={!stored?.systemPrompt}
          className="mr-auto"
        >
          Clear
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save}>
            Save
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
