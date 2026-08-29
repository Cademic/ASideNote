import { Plus } from "lucide-react";

interface CanvasEmptyStateProps {
  onCreate: () => void;
}

export function CanvasEmptyState({ onCreate }: CanvasEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div>
        <h3 className="font-editorial text-lg font-semibold text-[var(--land-ink)]">
          No boards yet
        </h3>
        <p className="mt-1 max-w-sm text-sm text-[var(--land-ink-2)]">
          Create a note board and it will show up here as your active canvas.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--land-amber)] bg-[var(--land-amber)] px-4 py-2 text-sm font-semibold text-[var(--land-on-accent)] transition-[filter] hover:brightness-95"
      >
        <Plus className="h-4 w-4" />
        Create a board
      </button>
    </div>
  );
}
