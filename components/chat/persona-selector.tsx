"use client";

import { useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  PencilEdit02Icon,
  Delete02Icon,
  PlusSignIcon,
  StarsIcon,
} from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BUILTIN_PERSONAS,
  type Persona,
  usePersonasStore,
} from "@/lib/personas-store";
import { cn } from "@/lib/utils";

type EditorState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; persona: Persona };

export function PersonaSelector({ className }: { className?: string }) {
  const customPersonas = usePersonasStore((s) => s.custom);
  const activeId = usePersonasStore((s) => s.activeId);
  const setActive = usePersonasStore((s) => s.setActive);
  const removePersona = usePersonasStore((s) => s.removePersona);

  const [editor, setEditor] = useState<EditorState>({ kind: "closed" });

  const allPersonas = useMemo(
    () => [...BUILTIN_PERSONAS, ...customPersonas],
    [customPersonas]
  );
  const active =
    allPersonas.find((p) => p.id === activeId) ?? BUILTIN_PERSONAS[0];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs",
            "text-muted-foreground hover:bg-accent hover:text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring",
            className
          )}
          aria-label={`Persona: ${active.name}`}
        >
          <HugeiconsIcon icon={StarsIcon} size={12} strokeWidth={1.75} />
          <span className="max-w-[14ch] truncate">{active.name}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} size={12} strokeWidth={2} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-96 w-72 overflow-y-auto">
          <div className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Built-in
          </div>
          {BUILTIN_PERSONAS.map((p) => (
            <PersonaRow
              key={p.id}
              persona={p}
              isActive={p.id === activeId}
              onSelect={() => setActive(p.id)}
            />
          ))}

          {customPersonas.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Yours
              </div>
              {customPersonas.map((p) => (
                <PersonaRow
                  key={p.id}
                  persona={p}
                  isActive={p.id === activeId}
                  onSelect={() => setActive(p.id)}
                  onEdit={() => setEditor({ kind: "edit", persona: p })}
                  onRemove={() => {
                    if (confirm(`Delete persona "${p.name}"?`)) {
                      removePersona(p.id);
                    }
                  }}
                />
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditor({ kind: "create" })}>
            <HugeiconsIcon icon={PlusSignIcon} size={14} strokeWidth={1.75} />
            Create persona…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PersonaEditor
        state={editor}
        onClose={() => setEditor({ kind: "closed" })}
      />
    </>
  );
}

function PersonaRow({
  persona,
  isActive,
  onSelect,
  onEdit,
  onRemove,
}: {
  persona: Persona;
  isActive: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="group/row flex items-center gap-1">
      <DropdownMenuItem
        onClick={onSelect}
        className={cn(
          "flex flex-1 flex-col items-start gap-0.5",
          isActive && "bg-accent"
        )}
      >
        <span className="font-medium">{persona.name}</span>
        {persona.prompt && (
          <span className="line-clamp-1 text-xs text-muted-foreground">
            {persona.prompt}
          </span>
        )}
        {!persona.prompt && (
          <span className="text-xs text-muted-foreground italic">
            No system prompt — uses the default behaviour
          </span>
        )}
      </DropdownMenuItem>
      {(onEdit || onRemove) && (
        <div className="flex shrink-0 items-center pr-1 opacity-0 transition-opacity group-hover/row:opacity-100">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={`Edit ${persona.name}`}
            >
              <HugeiconsIcon
                icon={PencilEdit02Icon}
                size={12}
                strokeWidth={1.75}
              />
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Delete ${persona.name}`}
            >
              <HugeiconsIcon
                icon={Delete02Icon}
                size={12}
                strokeWidth={1.75}
              />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PersonaEditor({
  state,
  onClose,
}: {
  state: EditorState;
  onClose: () => void;
}) {
  const addPersona = usePersonasStore((s) => s.addPersona);
  const updatePersona = usePersonasStore((s) => s.updatePersona);
  const setActive = usePersonasStore((s) => s.setActive);

  const isEdit = state.kind === "edit";
  const initial = state.kind === "edit" ? state.persona : null;

  const [name, setName] = useState(initial?.name ?? "");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");

  // Reset form when the editor opens for a different persona.
  const editingId = isEdit ? state.persona.id : null;
  const isOpen = state.kind !== "closed";
  useEffect(() => {
    if (!isOpen) return;
    setName(initial?.name ?? "");
    setPrompt(initial?.prompt ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingId]);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (isEdit) {
      updatePersona(state.persona.id, { name: trimmed, prompt });
    } else {
      const created = addPersona({ name: trimmed, prompt });
      setActive(created.id);
    }
    onClose();
  };

  return (
    <Dialog
      open={state.kind !== "closed"}
      onOpenChange={(v) => !v && onClose()}
    >
      <DialogContent className="flex max-h-[85vh] w-[min(95vw,720px)] max-w-[720px] flex-col gap-0 p-0 sm:max-w-[720px]">
        <DialogHeader className="border-b border-border/40 p-4">
          <DialogTitle>
            {isEdit ? `Edit ${initial?.name}` : "Create persona"}
          </DialogTitle>
          <DialogDescription>
            A persona is a system prompt that frames every reply. Switch
            personas any time from the picker above the input.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="persona-name">
              Name
            </label>
            <Input
              id="persona-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brutally honest reviewer"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="persona-prompt">
              System prompt
            </label>
            <Textarea
              id="persona-prompt"
              rows={10}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="You are…"
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              This is prepended to the assistant's base system prompt
              (which contains tool descriptions and your saved memories).
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-border/40 p-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={!name.trim()}>
            {isEdit ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

