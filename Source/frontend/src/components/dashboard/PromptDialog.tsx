import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  initialValue: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  maxLength?: number;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  isOpen,
  title,
  initialValue,
  placeholder,
  confirmLabel = "Rename",
  cancelLabel = "Cancel",
  maxLength = 100,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Trap focus + restore to opener + scroll lock + Escape. The input focus/select
  // below is kept for the text pre-selection the trap doesn't do.
  useFocusTrap(dialogRef, {
    active: isOpen,
    onEscape: onCancel,
    moveFocusIn: false,
  });

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  function handleConfirm() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-overlay-enter motion-reduce:animate-none"
        onClick={onCancel}
        onKeyDown={() => {}}
        role="presentation"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-4 w-full max-w-sm min-w-0 rounded-2xl border border-border bg-surface p-6 shadow-2xl overflow-hidden animate-dialog-enter motion-reduce:animate-none"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1 text-foreground/50 transition-colors hover:bg-background hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <h3 id={titleId} className="mb-4 pr-6 text-sm font-semibold text-foreground break-words">{title}</h3>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
          }}
          placeholder={placeholder}
          maxLength={maxLength}
          className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/60 transition-colors hover:bg-background hover:text-foreground"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!value.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
