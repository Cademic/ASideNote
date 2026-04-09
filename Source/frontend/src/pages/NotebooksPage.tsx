import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import { BookOpen, Plus, PencilLine, Upload } from "lucide-react";
import type { AppLayoutContext } from "../components/layout/AppLayout";
import {
  getNotebooks,
  createNotebook,
  deleteNotebook,
  updateNotebook,
  toggleNotebookPin,
  updateNotebookContent,
} from "../api/notebooks";
import { NotebookCard } from "../components/notebooks/NotebookCard";
import { CreateNotebookDialog } from "../components/notebooks/CreateNotebookDialog";
import { ConfirmDialog } from "../components/dashboard/ConfirmDialog";
import type { NotebookSummaryDto } from "../types";

export function NotebooksPage() {
  const { openNotebook, refreshPinnedNotebooks } = useOutletContext<AppLayoutContext>();
  const [notebooks, setNotebooks] = useState<NotebookSummaryDto[]>([]);
  const [totalNotebooks, setTotalNotebooks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotebookSummaryDto | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const fetchNotebooks = useCallback(async () => {
    try {
      setError(null);
      const result = await getNotebooks({ limit: 200 });
      setNotebooks(result.items);
      setTotalNotebooks(result.total);
    } catch {
      setError("Failed to load notebooks.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotebooks();
  }, [fetchNotebooks]);

  /** Derive notebook name from file name: strip path and remove .json extension. */
  function nameFromFileName(fileName: string): string {
    const base = fileName.replace(/^.*[/\\]/, "").trim();
    const withoutExt = base.replace(/\.json$/i, "").trim();
    return withoutExt || "Imported notebook";
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (totalNotebooks >= 5) {
      setImportError("Maximum 5 notebooks. Delete one to import another.");
      return;
    }
    setImportError(null);
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { type?: string; content?: unknown[] };
      const isTipTapDoc = parsed && typeof parsed === "object" && parsed.type === "doc";
      const contentJson = isTipTapDoc ? JSON.stringify(parsed) : JSON.stringify({ type: "doc", content: [] });
      const name = nameFromFileName(file.name);
      const created = await createNotebook({ name });
      await updateNotebookContent(created.id, { contentJson });
      setNotebooks((prev) => [created, ...prev]);
      setTotalNotebooks((t) => t + 1);
      openNotebook(created.id);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setImportError(err.response.data?.message ?? "Maximum 5 notebooks allowed. Delete one to import another.");
      } else {
        setImportError("Invalid or unsupported file. Use a notebook JSON export.");
        console.error("Import failed:", err);
      }
    } finally {
      setImporting(false);
    }
  }

  async function handleCreate(name: string) {
    try {
      setCreateError(null);
      const created = await createNotebook({ name });
      setNotebooks((prev) => [created, ...prev]);
      setTotalNotebooks((t) => t + 1);
      setIsCreateOpen(false);
      openNotebook(created.id);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setCreateError(
          err.response.data?.message ?? "Maximum 5 notebooks allowed. Delete one to create another.",
        );
      } else {
        setCreateError("Failed to create notebook. Please try again.");
        console.error("Failed to create notebook:", err);
      }
    }
  }

  function handleDelete(id: string) {
    const notebook = notebooks.find((n) => n.id === id) ?? null;
    if (notebook) setDeleteTarget(notebook);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setNotebooks((prev) => prev.filter((n) => n.id !== id));
    setTotalNotebooks((t) => Math.max(0, t - 1));
    try {
      await deleteNotebook(id);
      refreshPinnedNotebooks();
    } catch {
      fetchNotebooks();
    }
  }

  function handleRename(id: string, currentName: string) {
    setRenameTarget({ id, name: currentName });
    setRenameValue(currentName);
  }

  async function confirmRename() {
    if (!renameTarget || !renameValue.trim()) return;
    const { id } = renameTarget;
    const newName = renameValue.trim();
    setRenameTarget(null);
    setNotebooks((prev) =>
      prev.map((n) => (n.id === id ? { ...n, name: newName } : n)),
    );
    try {
      await updateNotebook(id, { name: newName });
    } catch {
      fetchNotebooks();
    }
  }

  async function handleTogglePin(id: string, isPinned: boolean) {
    setNotebooks((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, isPinned, pinnedAt: isPinned ? new Date().toISOString() : null }
          : n,
      ),
    );
    try {
      await toggleNotebookPin(id, isPinned);
      refreshPinnedNotebooks();
    } catch {
      fetchNotebooks();
    }
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="skeleton h-8 w-36" />
            <div className="skeleton h-9 w-36" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="paper-card relative flex flex-col rounded-lg p-5 pt-7 h-36">
                <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-lg skeleton" />
                <div className="skeleton h-4 w-3/4 mb-2" />
                <div className="skeleton h-3 w-1/2 mb-1" />
                <div className="skeleton h-3 w-2/3 mt-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-sm text-red-500">{error}</p>
          <button
            type="button"
            onClick={fetchNotebooks}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/40">
              <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Notebooks</h1>
              <p className="text-sm text-foreground/50">
                Your notebooks
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {importError && (
              <span className="text-xs text-red-500">{importError}</span>
            )}
            {totalNotebooks >= 5 && (
              <span className="text-xs text-foreground/50">
                Maximum 5 notebooks. Delete one to create another.
              </span>
            )}
            <input
              ref={importFileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              aria-hidden
              onChange={handleImportFile}
            />
            <button
              type="button"
              onClick={() => importFileInputRef.current?.click()}
              disabled={totalNotebooks >= 5 || importing}
              className="flex flex-shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:-translate-y-0.5 hover:border-primary/40 hover:bg-foreground/5 hover:shadow-md active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none"
            >
              <Upload className="h-4 w-4" />
              <span>{importing ? "Importing…" : "Import"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              disabled={totalNotebooks >= 5}
              className="flex flex-shrink-0 items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:-translate-y-0.5 hover:bg-amber-600 hover:shadow-md active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none motion-reduce:hover:transform-none"
            >
              <Plus className="h-4 w-4" />
              <span>New Notebook</span>
            </button>
          </div>
        </div>

        {/* Notebook grid or empty state */}
        {notebooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-background/40 py-20">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5">
              <PencilLine className="h-5 w-5 text-foreground/30" />
            </div>
            <p className="mb-4 text-sm text-foreground/40">No notebooks yet</p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 py-2 text-xs font-medium text-foreground/60 transition-[colors,box-shadow] duration-150 hover:border-primary/40 hover:text-primary hover:shadow-sm motion-reduce:transition-none"
            >
              <Plus className="h-3.5 w-3.5" />
              Create your first notebook
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {notebooks.map((notebook) => (
              <NotebookCard
                key={notebook.id}
                notebook={notebook}
                onOpen={openNotebook}
                onRename={handleRename}
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <CreateNotebookDialog
        isOpen={isCreateOpen}
        error={createError}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateError(null);
        }}
        onCreate={handleCreate}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Notebook"
        message={`Are you sure you want to delete "${deleteTarget?.name ?? "this notebook"}"? All pages will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setRenameTarget(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Rename Notebook
            </h2>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmRename();
              }}
              maxLength={100}
              className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRename}
                disabled={!renameValue.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
