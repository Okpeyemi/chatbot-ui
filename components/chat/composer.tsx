"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import {
  PlusSignIcon,
  Mic01Icon,
  ArrowUp02Icon,
  CancelCircleIcon,
  Pdf01Icon,
  Image01Icon,
  StopIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector } from "@/components/chat/model-selector";
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
  fileToAttached,
  type AttachedFile,
} from "@/lib/files";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { useUIStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

export type SubmitPayload = {
  text: string;
  files: AttachedFile[];
};

export type ComposerProps = {
  modelId: string;
  onModelChange: (id: string) => void;
  onSubmit: (payload: SubmitPayload) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
};

export type ComposerHandle = {
  setValue: (next: string) => void;
  appendValue: (extra: string) => void;
  focus: () => void;
};

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  {
    modelId,
    onModelChange,
    onSubmit,
    onStop,
    isStreaming,
    disabled,
    placeholder = "How can I help you today?",
    autoFocus,
    className,
  },
  ref
) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice input. Strips off the previous interim chunk on every event so the
  // final text settles cleanly.
  const language = useUIStore((s) => s.language);
  const interimRef = useRef("");
  const speech = useSpeechRecognition({
    lang: language || undefined,
    onTranscript: (chunk, isFinal) => {
      setValue((prev) => {
        const baseline = interimRef.current
          ? prev.slice(0, prev.length - interimRef.current.length)
          : prev;
        if (isFinal) {
          interimRef.current = "";
          const sep = baseline && !baseline.endsWith(" ") ? " " : "";
          return baseline + sep + chunk.trim();
        }
        interimRef.current = chunk;
        const sep = baseline && !baseline.endsWith(" ") ? " " : "";
        return baseline + sep + chunk;
      });
    },
    onError: (err) => {
      interimRef.current = "";
      if (err === "no-speech" || err === "aborted") return;
      const message =
        err === "not-allowed" || err === "service-not-allowed"
          ? "Microphone access denied. Allow it in your browser settings."
          : `Voice input failed: ${err}`;
      toast.error("Microphone", { description: message, duration: 5000 });
    },
  });
  const handleMicClick = () => {
    if (!speech.supported) {
      toast.error("Voice input not supported", {
        description:
          "Your browser doesn't expose the Web Speech API. Try Chrome / Edge / Safari.",
        duration: 5000,
      });
      return;
    }
    speech.toggle();
  };

  useImperativeHandle(
    ref,
    () => ({
      setValue: (next) => {
        setValue(next);
        // Move caret to end on the next tick so the user can keep typing.
        requestAnimationFrame(() => {
          const el = textareaRef.current;
          if (el) {
            el.focus();
            el.setSelectionRange(next.length, next.length);
          }
        });
      },
      appendValue: (extra) => {
        setValue((prev) => {
          const sep = prev && !prev.endsWith(" ") ? " " : "";
          const next = `${prev}${sep}${extra}`;
          requestAnimationFrame(() => {
            const el = textareaRef.current;
            if (el) {
              el.focus();
              el.setSelectionRange(next.length, next.length);
            }
          });
          return next;
        });
      },
      focus: () => textareaRef.current?.focus(),
    }),
    []
  );

  const submit = () => {
    const text = value.trim();
    if ((!text && files.length === 0) || disabled) return;
    onSubmit({ text, files });
    setValue("");
    setFiles([]);
    setError(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleFilesPicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files;
    if (!picked || picked.length === 0) return;

    const newFiles: AttachedFile[] = [];
    for (const file of Array.from(picked)) {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        setError(`Unsupported file type: ${file.type || file.name}`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} exceeds the 20 MB limit.`);
        continue;
      }
      newFiles.push(await fileToAttached(file));
    }
    if (newFiles.length > 0) {
      setError(null);
      setFiles((prev) => [...prev, ...newFiles]);
    }
    e.target.value = "";
  };

  const removeFile = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));

  const canSubmit = (value.trim().length > 0 || files.length > 0) && !disabled;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cn(
        "w-full overflow-hidden rounded-3xl border border-border/60 bg-card/60 shadow-xl",
        "focus-within:border-border focus-within:bg-card/90 transition-colors",
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES.join(",")}
        className="hidden"
        onChange={handleFilesPicked}
      />

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-border/40 px-3 py-2">
          {files.map((f) => (
            <FilePreview
              key={f.id}
              file={f}
              onRemove={() => removeFile(f.id)}
            />
          ))}
        </div>
      )}

      {error && (
        <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-1.5 text-xs text-destructive">
          {error}
        </div>
      )}

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={1}
        onKeyDown={handleKeyDown}
        className={cn(
          "min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent px-5 pt-4 text-base shadow-none",
          "focus-visible:ring-0 focus-visible:ring-offset-0",
          "placeholder:text-muted-foreground/70"
        )}
      />
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-md text-muted-foreground hover:text-foreground"
          aria-label="Add attachment"
          onClick={() => fileInputRef.current?.click()}
        >
          <HugeiconsIcon icon={PlusSignIcon} size={18} strokeWidth={1.5} />
        </Button>

        <div className="flex items-center gap-1">
          <ModelSelector value={modelId} onChange={onModelChange} />
          <Button
            type="button"
            variant={speech.listening ? "default" : "ghost"}
            size="icon"
            onClick={handleMicClick}
            className={cn(
              "size-8 rounded-md",
              speech.listening
                ? "animate-pulse"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={
              speech.listening ? "Stop voice input" : "Start voice input"
            }
            aria-pressed={speech.listening}
          >
            <HugeiconsIcon icon={Mic01Icon} size={18} strokeWidth={1.5} />
          </Button>
          {isStreaming && onStop ? (
            <Button
              type="button"
              size="icon"
              variant="default"
              onClick={onStop}
              className="size-8 rounded-md"
              aria-label="Stop generating"
            >
              <HugeiconsIcon icon={StopIcon} size={16} strokeWidth={2} />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!canSubmit}
              className="size-8 rounded-md"
              aria-label="Send message"
            >
              <HugeiconsIcon icon={ArrowUp02Icon} size={18} strokeWidth={2} />
            </Button>
          )}
        </div>
      </div>
    </form>
  );
});

function FilePreview({
  file,
  onRemove,
}: {
  file: AttachedFile;
  onRemove: () => void;
}) {
  const isImage = file.mediaType.startsWith("image/");
  const isPdf = file.mediaType === "application/pdf";

  return (
    <div className="group relative">
      {isImage ? (
        <Image
          src={file.url}
          alt={file.name}
          width={64}
          height={64}
          className="size-16 rounded-lg object-cover"
          unoptimized
        />
      ) : (
        <div className="flex size-16 items-center justify-center rounded-lg border border-border/60 bg-muted text-muted-foreground">
          <HugeiconsIcon
            icon={isPdf ? Pdf01Icon : Image01Icon}
            size={24}
            strokeWidth={1.5}
          />
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="absolute -right-1.5 -top-1.5 rounded-full bg-background text-foreground opacity-0 shadow ring-1 ring-border transition-opacity group-hover:opacity-100"
      >
        <HugeiconsIcon icon={CancelCircleIcon} size={18} strokeWidth={1.75} />
      </button>
      <span
        className="absolute bottom-0 left-0 right-0 truncate rounded-b-lg bg-black/50 px-1 text-[10px] text-white"
        title={file.name}
      >
        {file.name}
      </span>
    </div>
  );
}
