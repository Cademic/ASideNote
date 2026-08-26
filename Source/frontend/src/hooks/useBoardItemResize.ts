import { useEffect, useRef } from "react";
import { screenDeltaToWorldDelta } from "../lib/boardViewportMath";

export type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export interface BoardItemSize {
  width: number;
  height: number;
}

export interface BoardItemPosition {
  x: number;
  y: number;
}

export interface UseBoardItemResizeOptions {
  size: BoardItemSize;
  position: BoardItemPosition;
  zoom: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  setSize: (size: BoardItemSize) => void;
  setPosition: (position: BoardItemPosition) => void;
  setIsResizing: (isResizing: boolean) => void;
  /**
   * Called synchronously from the native mouseup handler with final rounded values. The hook
   * never defers this call itself — callers keep wrapping it in their own setTimeout(...,0) (or
   * not) exactly as before this was extracted, so each board item's PATCH-call sequencing/timing
   * relative to other calls is unchanged.
   */
  onResizeEnd: (final: { width: number; height: number; x: number; y: number }) => void;
}

interface ResizeStart {
  dir: ResizeDir;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  startPosX: number;
  startPosY: number;
}

/**
 * Shared 8-direction (n/s/e/w/ne/nw/se/sw) edge-and-corner resize interaction for board items
 * (sticky notes, index cards, images). Extracted from StickyNote/IndexCard/ImageCard, which each
 * had a byte-for-byte identical implementation parametrized only by different min/max size
 * constants. Screen-pixel mouse deltas are converted to board (world) deltas via
 * screenDeltaToWorldDelta so resizing tracks the cursor correctly at any zoom level, the same
 * formula board panning uses.
 */
export function useBoardItemResize(options: UseBoardItemResizeOptions): {
  startResize: (dir: ResizeDir) => (e: React.MouseEvent) => void;
} {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const resizeRef = useRef<ResizeStart | null>(null);
  const lastValuesRef = useRef<{ w: number; h: number; x: number; y: number } | null>(null);
  const listenersRef = useRef<{
    move: (e: MouseEvent) => void;
    up: () => void;
  } | null>(null);

  function startResize(dir: ResizeDir) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (listenersRef.current) {
        document.removeEventListener("mousemove", listenersRef.current.move);
        document.removeEventListener("mouseup", listenersRef.current.up);
      }

      const { size, position } = optionsRef.current;
      resizeRef.current = {
        dir,
        startX: e.clientX,
        startY: e.clientY,
        startW: size.width,
        startH: size.height,
        startPosX: position.x,
        startPosY: position.y,
      };
      lastValuesRef.current = null;

      optionsRef.current.setIsResizing(true);

      function onMove(ev: MouseEvent) {
        const rs = resizeRef.current;
        if (!rs) return;
        const { zoom, minWidth, maxWidth, minHeight, maxHeight, setSize, setPosition } = optionsRef.current;

        const { x: dx, y: dy } = screenDeltaToWorldDelta(ev.clientX - rs.startX, ev.clientY - rs.startY, zoom);

        let newW = rs.startW;
        let newH = rs.startH;
        let newX = rs.startPosX;
        let newY = rs.startPosY;

        if (rs.dir === "e" || rs.dir === "ne" || rs.dir === "se") {
          newW = Math.min(maxWidth, Math.max(minWidth, rs.startW + dx));
        }
        if (rs.dir === "w" || rs.dir === "nw" || rs.dir === "sw") {
          const proposed = rs.startW - dx;
          if (proposed >= minWidth && proposed <= maxWidth) {
            newW = proposed;
            newX = rs.startPosX + dx;
          } else if (proposed < minWidth) {
            newW = minWidth;
            newX = rs.startPosX + (rs.startW - minWidth);
          } else {
            newW = maxWidth;
            newX = rs.startPosX + (rs.startW - maxWidth);
          }
        }
        if (rs.dir === "s" || rs.dir === "se" || rs.dir === "sw") {
          newH = Math.min(maxHeight, Math.max(minHeight, rs.startH + dy));
        }
        if (rs.dir === "n" || rs.dir === "ne" || rs.dir === "nw") {
          const proposed = rs.startH - dy;
          if (proposed >= minHeight && proposed <= maxHeight) {
            newH = proposed;
            newY = rs.startPosY + dy;
          } else if (proposed < minHeight) {
            newH = minHeight;
            newY = rs.startPosY + (rs.startH - minHeight);
          } else {
            newH = maxHeight;
            newY = rs.startPosY + (rs.startH - maxHeight);
          }
        }

        newW = Math.max(minWidth, newW);
        newH = Math.max(minHeight, newH);

        lastValuesRef.current = { w: newW, h: newH, x: newX, y: newY };
        setSize({ width: newW, height: newH });
        setPosition({ x: newX, y: newY });
      }

      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        listenersRef.current = null;

        const rs = resizeRef.current;
        resizeRef.current = null;
        let final = lastValuesRef.current;
        lastValuesRef.current = null;

        const { setSize, setPosition, setIsResizing, onResizeEnd } = optionsRef.current;
        setIsResizing(false);

        if (!final && rs) {
          final = { w: rs.startW, h: rs.startH, x: rs.startPosX, y: rs.startPosY };
        }
        if (final) {
          setSize({ width: final.w, height: final.h });
          setPosition({ x: final.x, y: final.y });
          onResizeEnd({
            width: Math.round(final.w),
            height: Math.round(final.h),
            x: Math.round(final.x),
            y: Math.round(final.y),
          });
        }
      }

      listenersRef.current = { move: onMove, up: onUp };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };
  }

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      if (listenersRef.current) {
        document.removeEventListener("mousemove", listenersRef.current.move);
        document.removeEventListener("mouseup", listenersRef.current.up);
        listenersRef.current = null;
      }
    };
  }, []);

  return { startResize };
}
