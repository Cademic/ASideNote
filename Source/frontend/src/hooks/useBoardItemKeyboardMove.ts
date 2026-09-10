import { useCallback, useRef } from "react";

interface Point {
  x: number;
  y: number;
}

export interface BoardItemKeyboardMoveOptions {
  /** Current world-coordinate position of the item. */
  position: Point;
  /** Commits a new position to local state (same setter react-draggable reads). */
  setPosition: (next: Point) => void;
  /** Rendered size — used to keep the item inside the far board edges. */
  size: { width: number; height: number };
  /** Persist the move (parent's `onDragStop(id, x, y)`, already bound to the id). */
  onMoveEnd: (x: number, y: number) => void;
  /** Enter / Space handler (e.g. open the item for editing). Optional. */
  onActivate?: () => void;
  /** Delete / Backspace handler (e.g. open the item's delete confirm). Optional. */
  onDelete?: () => void;
  /** Raise the item above its siblings before moving. Optional. */
  onBringToFront?: () => void;
  /** Skip all handling (e.g. while the item is being edited or resized). */
  disabled?: boolean;
  boardMinX?: number;
  boardMinY?: number;
  boardMaxX?: number;
  boardMaxY?: number;
  /** Nudge distance in world px. Default 10, or 50 with Shift held. */
  step?: number;
  largeStep?: number;
}

/**
 * Returns an `onKeyDown` handler that moves a freeform board item (sticky note,
 * index card, image) with the arrow keys — the keyboard equivalent of dragging
 * it. Shift = larger step; Enter / Space triggers `onActivate`. Only acts when
 * the event originates on the element the handler is attached to (so arrow keys
 * inside a nested button or editor are left alone). Attach to the same node that
 * carries `tabIndex={0}`.
 */
export function useBoardItemKeyboardMove({
  position,
  setPosition,
  size,
  onMoveEnd,
  onActivate,
  onDelete,
  onBringToFront,
  disabled = false,
  boardMinX = -Infinity,
  boardMinY = -Infinity,
  boardMaxX = Infinity,
  boardMaxY = Infinity,
  step = 10,
  largeStep = 50,
}: BoardItemKeyboardMoveOptions) {
  // Mirror position so a held arrow key (repeats fire before re-render) keeps
  // accumulating instead of restepping from the same stale value.
  const posRef = useRef(position);
  posRef.current = position;

  return useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.target !== e.currentTarget) return;

      if (e.key === "Enter" || e.key === " ") {
        if (!onActivate) return;
        e.preventDefault();
        onActivate();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (!onDelete) return;
        e.preventDefault();
        onDelete();
        return;
      }

      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = -1;
      else if (e.key === "ArrowRight") dx = 1;
      else if (e.key === "ArrowUp") dy = -1;
      else if (e.key === "ArrowDown") dy = 1;
      else return;

      e.preventDefault();
      const dist = e.shiftKey ? largeStep : step;
      const cur = posRef.current;
      const nx = Math.min(Math.max(cur.x + dx * dist, boardMinX), boardMaxX - size.width);
      const ny = Math.min(Math.max(cur.y + dy * dist, boardMinY), boardMaxY - size.height);
      if (nx === cur.x && ny === cur.y) return;

      const next = { x: nx, y: ny };
      posRef.current = next;
      onBringToFront?.();
      setPosition(next);
      onMoveEnd(nx, ny);
    },
    [
      disabled,
      onActivate,
      onDelete,
      onBringToFront,
      setPosition,
      onMoveEnd,
      size.width,
      size.height,
      boardMinX,
      boardMinY,
      boardMaxX,
      boardMaxY,
      step,
      largeStep,
    ],
  );
}
