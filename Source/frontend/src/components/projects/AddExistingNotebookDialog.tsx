import { useCallback, useEffect, useState } from "react";
import { X, BookOpen, Search, Check } from "lucide-react";
import { getNotebooks } from "../../api/notebooks";
import type { NotebookSummaryDto } from "../../types";

interface AddExistingNotebookDialogProps {
  isOpen: boolean;
  projectNotebookIds: string[];
  onClose: () => void;
  onAdd: (notebookId: string) => void;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function AddExistingNotebookDialog({
  isOpen,
  projectNotebookIds,
  onClose,
  onAdd,
}: AddExistingNotebookDialogProps) {
  const [notebooks, setNotebooks] = useState<NotebookSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const fetchNotebooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getNotebooks({ limit: 200 });
      const available = result.items.filter(
        (n) => !n.projectId && !projectNotebookIds.includes(n.id),
      );
      setNotebooks(available);
    } catch {
      setNotebooks([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectNotebookIds]);

  useEffect(() => {
    if (isOpen) {
      fetchNotebooks();
      setSelectedId(null);
      setSearch("");
    }
  }, [isOpen, fetchNotebooks]);

  const filtered = search.trim()
    ? notebooks.filter((n) =>
        n.name.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : notebooks;

  async function handleAdd() {
    if (!selectedId) return;
    setIsAdding(true);
    try {
      onAdd(selectedId);
    } finally {
      setIsAdding(false);
      setSelectedId(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 animate-overlay-enter motion-reduce:animate-none"
        onClick={onClose}
        onKeyDown={() => {}}
        role="presentation"
      />

      <div
        className="relative mx-4 flex w-full max-w-lg flex-col rounded-2xl border border-border bg-surface shadow-2xl animate-dialog-enter motion-reduce:animate-none"
        style={{ maxHeight: "80vh" }}
      >
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            Add Existing Notebook
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-foreground/50 transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-border/40 px-6 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your notebooks..."
              autoFocus
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto px-6 py-3"
          style={{ minHeight: "200px", maxHeight: "400px" }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="mb-2 h-8 w-8 text-foreground/20" />
              <p className="text-sm text-foreground/40">
                {notebooks.length === 0
                  ? "All your notebooks are already in projects"
                  : "No notebooks match your search"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((notebook) => {
                const isSelected = selectedId === notebook.id;
                return (
                  <button
                    key={notebook.id}
                    type="button"
                    onClick={() =>
                      setSelectedId(isSelected ? null : notebook.id)
                    }
                    className={[
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 motion-reduce:transition-none",
                      isSelected
                        ? "bg-amber-50 ring-2 ring-amber-400 dark:bg-amber-950/30 dark:ring-amber-500"
                        : "hover:bg-foreground/[0.03]",
                    ].join(" ")}
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-foreground/5">
                      <BookOpen className="h-4 w-4 text-foreground/50" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {notebook.name}
                      </span>
                      <span className="text-[10px] text-foreground/40">
                        Updated {formatRelativeDate(notebook.updatedAt)}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/40 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/60 transition-colors hover:bg-background hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedId || isAdding}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAdding ? "Adding..." : "Add to Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
