import { useCallback, useEffect, useState } from "react";
import {
  X,
  ClipboardList,
  PenTool,
  Calendar,
  Search,
  Check,
} from "lucide-react";
import { getBoards } from "../../api/boards";
import type { BoardSummaryDto } from "../../types";

interface AddExistingBoardDialogProps {
  isOpen: boolean;
  projectBoardIds: string[];
  onClose: () => void;
  onAdd: (boardId: string) => void;
}

const BOARD_TYPE_ICON: Record<string, typeof ClipboardList> = {
  NoteBoard: ClipboardList,
  ChalkBoard: PenTool,
  Calendar: Calendar,
};

const BOARD_TYPE_LABEL: Record<string, string> = {
  NoteBoard: "Note Board",
  ChalkBoard: "Chalk Board",
  Calendar: "Calendar",
};

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

export function AddExistingBoardDialog({
  isOpen,
  projectBoardIds,
  onClose,
  onAdd,
}: AddExistingBoardDialogProps) {
  const [boards, setBoards] = useState<BoardSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const fetchBoards = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getBoards({ limit: 200 });
      // Filter out boards already in this project or in another project
      const available = result.items.filter(
        (b) => !b.projectId && !projectBoardIds.includes(b.id),
      );
      setBoards(available);
    } catch {
      setBoards([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectBoardIds]);

  useEffect(() => {
    if (isOpen) {
      fetchBoards();
      setSelectedId(null);
      setSearch("");
    }
  }, [isOpen, fetchBoards]);

  const filtered = search.trim()
    ? boards.filter((b) =>
        b.name.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : boards;

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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-overlay-enter motion-reduce:animate-none"
        onClick={onClose}
        onKeyDown={() => {}}
        role="presentation"
      />

      {/* Dialog */}
      <div className="relative mx-4 flex w-full max-w-lg flex-col rounded-2xl border border-border bg-surface shadow-2xl animate-dialog-enter motion-reduce:animate-none"
        style={{ maxHeight: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            Add Existing Board
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-foreground/50 transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-border/40 px-6 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your boards..."
              autoFocus
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Board list */}
        <div className="flex-1 overflow-y-auto px-6 py-3" style={{ minHeight: "200px", maxHeight: "400px" }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="mb-2 h-8 w-8 text-foreground/20" />
              <p className="text-sm text-foreground/40">
                {boards.length === 0
                  ? "All your boards are already in projects"
                  : "No boards match your search"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((board) => {
                const isSelected = selectedId === board.id;
                const Icon = BOARD_TYPE_ICON[board.boardType] ?? ClipboardList;
                return (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() =>
                      setSelectedId(isSelected ? null : board.id)
                    }
                    className={[
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 motion-reduce:transition-none",
                      isSelected
                        ? "bg-violet-50 ring-2 ring-violet-400 dark:bg-violet-950/30 dark:ring-violet-500"
                        : "hover:bg-foreground/[0.03]",
                    ].join(" ")}
                  >
                    {/* Icon */}
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-foreground/5">
                      <Icon className="h-4 w-4 text-foreground/50" />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {board.name}
                      </span>
                      <span className="text-[10px] text-foreground/40">
                        {BOARD_TYPE_LABEL[board.boardType] ?? board.boardType}
                        {" \u00b7 "}
                        Updated {formatRelativeDate(board.updatedAt)}
                      </span>
                    </div>

                    {/* Check indicator */}
                    {isSelected && (
                      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-violet-500">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
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
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAdding ? "Adding..." : "Add to Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
