import { useState } from "react";
import { X } from "lucide-react";

interface CreateNotebookDialogProps {
  isOpen: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function CreateNotebookDialog({ isOpen, error, onClose, onCreate }: CreateNotebookDialogProps) {
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
  }

  function handleClose() {
    setName("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 animate-overlay-enter motion-reduce:animate-none" onClick={handleClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl animate-dialog-enter motion-reduce:animate-none">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Create notebook</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-foreground/50 hover:bg-foreground/5 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label htmlFor="notebook-name" className="mb-1.5 block text-sm font-medium text-foreground/70">
            Name
          </label>
          <input
            id="notebook-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="My notebook"
            className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-foreground/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
