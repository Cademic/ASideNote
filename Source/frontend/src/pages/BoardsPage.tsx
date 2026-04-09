import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import axios from "axios";
import {
  ClipboardList,
  Plus,
  Filter,
  PencilLine,
  Upload,
} from "lucide-react";
import type { AppLayoutContext } from "../components/layout/AppLayout";
import {
  getBoards,
  createBoard,
  createBoardImageCard,
  deleteBoard,
  updateBoard,
  toggleBoardPin,
} from "../api/boards";
import { getProjects, addBoardToProject } from "../api/projects";
import { createNote } from "../api/notes";
import { createIndexCard } from "../api/index-cards";
import { createConnection } from "../api/connections";
import { saveDrawing } from "../api/drawings";
import { parseBoardExportFile } from "../lib/boardExport";
import { BoardCard } from "../components/dashboard/BoardCard";
import { ConfirmDialog } from "../components/dashboard/ConfirmDialog";
import { CreateBoardDialog } from "../components/dashboard/CreateBoardDialog";
import type { BoardSummaryDto, ProjectSummaryDto } from "../types";

function getUniqueBoardName(baseName: string, existingNames: Set<string>): string {
  const name = baseName.trim() || "Imported Board";
  let candidate = name;
  let n = 1;
  while (existingNames.has(candidate)) {
    candidate = `${name} (${n})`;
    n++;
  }
  return candidate;
}

const BOARD_TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "NoteBoard", label: "Note Boards" },
  { value: "ChalkBoard", label: "Chalk Boards" },
];

export function BoardsPage() {
  const { closeBoard, refreshPinnedBoards } = useOutletContext<AppLayoutContext>();
  const [boards, setBoards] = useState<BoardSummaryDto[]>([]);
  const [activeProjects, setActiveProjects] = useState<ProjectSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boardTypeFilter, setBoardTypeFilter] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BoardSummaryDto | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const fetchBoards = useCallback(async () => {
    try {
      setError(null);
      const result = await getBoards({ limit: 200 });
      setBoards(result.items);
    } catch {
      setError("Failed to load boards.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const result = await getProjects({ status: "Active" }).catch(
        () => [] as ProjectSummaryDto[],
      );
      setActiveProjects(result);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredBoards = useMemo(() => {
    if (!boardTypeFilter) return boards;
    return boards.filter((b) => b.boardType === boardTypeFilter);
  }, [boards, boardTypeFilter]);

  const navigate = useNavigate();

  function handleImportClick() {
    importFileInputRef.current?.click();
  }

  async function handleImportFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const payload = parseBoardExportFile(text);
      if (!payload) {
        setIsImporting(false);
        return;
      }
      const existingNames = new Set(boards.map((b) => b.name));
      const boardName = getUniqueBoardName(payload.boardName, existingNames);

      const created = await createBoard({
        name: boardName,
        description: undefined,
        boardType: payload.boardType,
      });
      setBoards((prev) => [created, ...prev]);
      const boardId = created.id;
      const idMap = new Map<string, string>();

      if (payload.boardType === "NoteBoard") {
        for (const n of payload.notes ?? []) {
          const note = await createNote({
            content: n.content,
            boardId,
            title: n.title ?? undefined,
            positionX: n.positionX ?? 20,
            positionY: n.positionY ?? 20,
            width: n.width ?? undefined,
            height: n.height ?? undefined,
            color: n.color ?? undefined,
            rotation: n.rotation ?? undefined,
          });
          idMap.set(n.id, note.id);
        }
        for (const c of payload.indexCards ?? []) {
          const card = await createIndexCard({
            content: c.content,
            boardId,
            title: c.title ?? undefined,
            positionX: c.positionX ?? 20,
            positionY: c.positionY ?? 20,
            width: c.width ?? undefined,
            height: c.height ?? undefined,
            color: c.color ?? undefined,
            rotation: c.rotation ?? undefined,
          });
          idMap.set(c.id, card.id);
        }
        for (const img of payload.imageCards ?? []) {
          const imageCard = await createBoardImageCard(boardId, {
            imageUrl: img.imageUrl,
            positionX: img.positionX,
            positionY: img.positionY,
            width: img.width ?? undefined,
            height: img.height ?? undefined,
            rotation: img.rotation ?? undefined,
          });
          idMap.set(img.id, imageCard.id);
        }
        for (const conn of payload.connections ?? []) {
          const fromId = idMap.get(conn.fromItemId);
          const toId = idMap.get(conn.toItemId);
          if (fromId && toId) {
            await createConnection({
              fromItemId: fromId,
              toItemId: toId,
              boardId,
            });
          }
        }
      } else if (payload.boardType === "ChalkBoard") {
        if (payload.drawing?.canvasJson) {
          await saveDrawing(boardId, { canvasJson: payload.drawing.canvasJson });
        }
        for (const n of payload.notes ?? []) {
          await createNote({
            content: n.content,
            boardId,
            title: n.title ?? undefined,
            positionX: n.positionX ?? 20,
            positionY: n.positionY ?? 20,
            width: n.width ?? undefined,
            height: n.height ?? undefined,
            color: n.color ?? undefined,
            rotation: n.rotation ?? undefined,
          });
        }
      }

      const path =
        created.boardType === "ChalkBoard"
          ? `/chalkboards/${created.id}`
          : `/boards/${created.id}`;
      navigate(path);
    } catch (err) {
      console.error("Import board failed:", err);
    } finally {
      setIsImporting(false);
    }
  }

  async function handleCreate(name: string, description: string, boardType: string) {
    try {
      setCreateError(null);
      const created = await createBoard({
        name,
        description: description || undefined,
        boardType,
      });
      setBoards((prev) => [created, ...prev]);
      setIsCreateOpen(false);
      const path =
        created.boardType === "ChalkBoard"
          ? `/chalkboards/${created.id}`
          : `/boards/${created.id}`;
      navigate(path);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setCreateError(
          err.response.data?.message ?? "A board with that name already exists.",
        );
      } else {
        setCreateError("Failed to create board. Please try again.");
        console.error("Failed to create board:", err);
      }
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
    closeBoard(id);
    try {
      await deleteBoard(id);
      refreshPinnedBoards();
    } catch {
      fetchBoards();
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
    setBoards((prev) =>
      prev.map((b) => (b.id === id ? { ...b, name: newName } : b)),
    );
    try {
      await updateBoard(id, { name: newName });
    } catch {
      fetchBoards();
    }
  }

  async function handleMoveToProject(boardId: string, projectId: string) {
    try {
      await addBoardToProject(projectId, boardId);
      setBoards((prev) =>
        prev.map((b) => (b.id === boardId ? { ...b, projectId } : b)),
      );
    } catch {
      console.error("Failed to move board to project");
    }
  }

  async function handleTogglePin(id: string, isPinned: boolean) {
    setBoards((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, isPinned, pinnedAt: isPinned ? new Date().toISOString() : null }
          : b,
      ),
    );
    try {
      await toggleBoardPin(id, isPinned);
      refreshPinnedBoards();
    } catch {
      fetchBoards();
    }
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="skeleton h-8 w-32" />
            <div className="skeleton h-9 w-28" />
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
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/40">
              <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Boards</h1>
              <p className="text-sm text-foreground/50">
                Note boards and chalk boards in one place
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleImportClick}
              disabled={isImporting}
              className="flex items-center gap-2 rounded-lg border border-border/80 bg-background px-4 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              <span>{isImporting ? "Importing…" : "Import Board"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:-translate-y-0.5 hover:bg-amber-600 hover:shadow-md active:translate-y-0 active:scale-[0.98] dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none motion-reduce:hover:transform-none"
            >
              <Plus className="h-4 w-4" />
              <span>New Board</span>
            </button>
          </div>
        </div>

        {/* Type filter pills */}
        <div className="mb-6 flex items-center gap-2">
          <Filter className="h-4 w-4 text-foreground/40" />
          {BOARD_TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setBoardTypeFilter(filter.value)}
              className={[
                "rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 motion-reduce:transition-none",
                boardTypeFilter === filter.value
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                  : "text-foreground/50 hover:bg-foreground/5 hover:text-foreground",
              ].join(" ")}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Board grid or empty state */}
        {filteredBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-background/40 py-20">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5">
              <PencilLine className="h-5 w-5 text-foreground/30" />
            </div>
            <p className="mb-4 text-sm text-foreground/40">
              {boardTypeFilter
                ? `No ${boardTypeFilter === "NoteBoard" ? "note" : "chalk"} boards yet`
                : "No boards yet"}
            </p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 py-2 text-xs font-medium text-foreground/60 transition-[colors,box-shadow] duration-150 hover:border-primary/40 hover:text-primary hover:shadow-sm motion-reduce:transition-none"
            >
              <Plus className="h-3.5 w-3.5" />
              Create your first board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBoards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                onDelete={handleDelete}
                onRename={handleRename}
                onMoveToProject={handleMoveToProject}
                onTogglePin={handleTogglePin}
                activeProjects={activeProjects}
              />
            ))}
          </div>
        )}
      </div>

      <input
        ref={importFileInputRef}
        type="file"
        accept=".json,.asidenote-board,application/json"
        className="hidden"
        aria-hidden
        onChange={handleImportFileSelect}
      />
      <CreateBoardDialog
        isOpen={isCreateOpen}
        error={createError}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateError(null);
        }}
        onCreateBoard={handleCreate}
        onCreateProject={() => {}}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Board"
        message={`Are you sure you want to delete "${deleteTarget?.name ?? "this board"}"? All notes and index cards inside will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Rename Dialog */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setRenameTarget(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Rename Board
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
