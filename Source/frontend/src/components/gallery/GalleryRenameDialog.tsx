import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface GalleryRenameDialogProps {
  isOpen: boolean;
  /** Singular kind label for the heading, e.g. "Project", "Board", "Notebook". */
  kindLabel: string;
  initialName: string;
  initialDescription: string;
  /** Notebooks have no description field — hide the textarea when false. */
  showDescription: boolean;
  nameMaxLength?: number;
  descriptionMaxLength?: number;
  onConfirm: (name: string, description: string) => void;
  onCancel: () => void;
}

export function GalleryRenameDialog({
  isOpen,
  kindLabel,
  initialName,
  initialDescription,
  showDescription,
  nameMaxLength = 100,
  descriptionMaxLength = 500,
  onConfirm,
  onCancel,
}: GalleryRenameDialogProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialName);
    setDescription(initialDescription);
    const timer = setTimeout(() => {
      nameRef.current?.focus();
      nameRef.current?.select();
    }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  function handleConfirm() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onConfirm(trimmedName, description.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 animate-overlay-enter motion-reduce:animate-none"
        onClick={onCancel}
        onKeyDown={() => {}}
        role="presentation"
      />

      <div className="relative mx-4 w-full max-w-md min-w-0 overflow-hidden rounded-2xl border border-[var(--land-rule)] bg-[var(--land-paper)] p-6 animate-dialog-enter motion-reduce:animate-none">
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-foreground/50 transition-colors hover:bg-background hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="mb-4 pr-6 text-sm font-semibold text-foreground break-words">
          Edit {kindLabel}
        </h3>

        <label className="mb-1 block text-xs font-medium text-foreground/60">
          Name
        </label>
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleConfirm();
          }}
          maxLength={nameMaxLength}
          className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />

        {showDescription && (
          <>
            <label className="mb-1 block text-xs font-medium text-foreground/60">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={descriptionMaxLength}
              rows={3}
              placeholder="Add a short description…"
              className="mb-4 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/60 transition-colors hover:bg-background hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!name.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
