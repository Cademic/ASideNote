import { Suspense, lazy } from "react";
import { Maximize2 } from "lucide-react";
import type { BoardSummaryDto } from "../../../types";
import { CanvasEmptyState } from "./CanvasEmptyState";

const EmbeddedBoard = lazy(() =>
  import("../../../pages/NoteBoardPage").then((m) => ({ default: m.NoteBoardPage })),
);

const EmbeddedChalkBoard = lazy(() =>
  import("../../../pages/ChalkBoardPage").then((m) => ({ default: m.ChalkBoardPage })),
);

interface DashboardCanvasZoneProps {
  board: BoardSummaryDto | null;
  /** Opens the full board page for the previewed board. */
  onOpenBoard: () => void;
  onCreate: () => void;
}

export function DashboardCanvasZone({ board, onOpenBoard, onCreate }: DashboardCanvasZoneProps) {
  const isChalk = board?.boardType === "ChalkBoard";
  return (
    <section className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[var(--land-paper)]">
      {board && (
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--land-ink)]">
            {board.name}
          </span>
          <button
            type="button"
            onClick={onOpenBoard}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--land-rule)] bg-[var(--land-paper)] px-2.5 py-1 text-xs font-semibold text-[var(--land-ink)] transition-colors hover:bg-[var(--land-cream)]"
          >
            <Maximize2 className="h-3.5 w-3.5 shrink-0 text-[var(--land-ink-3)]" />
            Open board
          </button>
        </div>
      )}

      <div className="relative min-h-0 w-full min-w-0 flex-1 overflow-hidden">
        {board ? (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--land-amber)] border-t-transparent" />
              </div>
            }
          >
            {isChalk ? (
              <EmbeddedChalkBoard
                key={board.id}
                boardId={board.id}
                variant="embedded"
                disableRealtime
              />
            ) : (
              <EmbeddedBoard key={board.id} boardId={board.id} variant="embedded" disableRealtime />
            )}
          </Suspense>
        ) : (
          <CanvasEmptyState onCreate={onCreate} />
        )}
      </div>
    </section>
  );
}
