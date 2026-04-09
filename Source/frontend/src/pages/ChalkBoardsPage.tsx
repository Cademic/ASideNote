import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PenTool, Plus, PencilLine } from "lucide-react";
import { getBoards, createBoard, deleteBoard } from "../api/boards";
import { BoardCard } from "../components/dashboard/BoardCard";
import { ConfirmDialog } from "../components/dashboard/ConfirmDialog";
import { CreateBoardDialog } from "../components/dashboard/CreateBoardDialog";
import type { BoardSummaryDto } from "../types";

export function ChalkBoardsPage() {
  const [boards, setBoards] = useState<BoardSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BoardSummaryDto | null>(null);

  const fetchBoards = useCallback(async () => {
    try {
      setError(null);
      const result = await getBoards({ boardType: "ChalkBoard", limit: 100 });
      setBoards(result.items);
    } catch {
      setError("Failed to load chalkboards.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const navigate = useNavigate();

  async function handleCreate(name: string, description: string, boardType: string) {
    try {
      const created = await createBoard({
        name,
        description: description || undefined,
        boardType,
      });
      setBoards((prev) => [created, ...prev]);
      navigate(`/chalkboards/${created.id}`);
    } catch {
      // Silently fail
    }
  }

  function handleDelete(id: string) {
    const board = boards.find((b) => b.id === id) ?? null;
    if (board) setDeleteTarget(board);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setBoards((prev) => prev.filter((b) => b.id !== id));
    try {
      await deleteBoard(id);
    } catch {
      fetchBoards();
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-foreground/60">Loading chalkboards...</span>
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
            onClick={fetchBoards}
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
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/40">
              <PenTool className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Chalk Boards</h1>
              <p className="text-sm text-foreground/50">
                Freehand drawing canvas for sketches and brainstorming
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:bg-emerald-600 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] dark:bg-emerald-600 dark:hover:bg-emerald-500 motion-reduce:transition-none motion-reduce:hover:transform-none"
          >
            <Plus className="h-4 w-4" />
            <span>New Chalkboard</span>
          </button>
        </div>

        {/* Board grid or empty state */}
        {boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-background/40 py-20">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5">
              <PencilLine className="h-5 w-5 text-foreground/30" />
            </div>
            <p className="mb-4 text-sm text-foreground/40">No chalkboards yet</p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 py-2 text-xs font-medium text-foreground/60 transition-[colors,box-shadow] duration-150 hover:border-primary/40 hover:text-primary hover:shadow-sm motion-reduce:transition-none"
            >
              <Plus className="h-3.5 w-3.5" />
              Create your first chalkboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <BoardCard key={board.id} board={board} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      <CreateBoardDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreateBoard={handleCreate}
        onCreateProject={() => { /* no-op */ }}
        defaultBoardType="ChalkBoard"
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Chalkboard"
        message={`Are you sure you want to delete "${deleteTarget?.name ?? "this chalkboard"}"? All drawings and notes inside will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
