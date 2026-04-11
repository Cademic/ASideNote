import { useEffect, useState } from "react";
import { Folder, X } from "lucide-react";

interface CreateProjectFolderDialogProps {
  isOpen: boolean;
  error: string | null;
  isSaving?: boolean;
  onClose: () => void;
  onCreate: (name: string) => void | Promise<void>;
  /** Boards tab uses violet accents; notebooks tab uses amber. */
  accent?: "violet" | "amber";
}

export function CreateProjectFolderDialog({
  isOpen,
  error,
  isSaving = false,
  onClose,
  onCreate,
  accent = "violet",
}: CreateProjectFolderDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!isOpen) setName("");
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isSaving) return;
    await onCreate(trimmed);
  }

  function handleClose() {
    if (isSaving) return;
    setName("");
    onClose();
  }

  if (!isOpen) return null;

  const submitClass =
    accent === "amber"
      ? "rounded-lg bg-amber-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-40 dark:bg-amber-600 dark:hover:bg-amber-500"
      : "rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-40 dark:bg-violet-600 dark:hover:bg-violet-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/40 animate-overlay-enter motion-reduce:animate-none"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl animate-dialog-enter motion-reduce:animate-none">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={
                accent === "amber"
                  ? "flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30"
                  : "flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30"
              }
            >
              <Folder
                className={
                  accent === "amber"
                    ? "h-4 w-4 text-amber-700 dark:text-amber-400"
                    : "h-4 w-4 text-violet-700 dark:text-violet-400"
                }
              />
            </div>
            <h2 className="text-lg font-semibold text-foreground">New folder</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="rounded-lg p-1 text-foreground/50 hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <label htmlFor="project-folder-name" className="mb-1.5 block text-sm font-medium text-foreground/70">
            Folder name
          </label>
          <input
            id="project-folder-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="e.g. Sprint 3, Research"
            disabled={isSaving}
            className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
            autoFocus
          />
          {error && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-foreground/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || isSaving} className={submitClass}>
              {isSaving ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
