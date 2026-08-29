import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  useSidebar,
} from "./SidebarContext";

/**
 * Full-height edge handle on the sidebar's right border.
 *
 *  - collapsed sidebar → click to expand (pointer-only convenience that mirrors the
 *    chevron button; stays out of the tab order / a11y tree to avoid announcing a
 *    duplicate "Expand sidebar" control)
 *  - expanded sidebar → a focusable `separator` (the WAI-ARIA window-splitter pattern):
 *    drag to resize, ←/→ to nudge (Shift for a larger step), Home/End for min/max,
 *    Enter/Space to snap back to the default width. A click without dragging still
 *    collapses; a double-click also resets to the default width.
 */
const DRAG_THRESHOLD_PX = 3;
/** Longest gap between two rail taps that still counts as a double-tap (→ reset). */
const DOUBLE_TAP_MS = 250;
/** Arrow-key resize increments. */
const KEYBOARD_STEP_PX = 16;
const KEYBOARD_STEP_LARGE_PX = 64;

export function SidebarRail() {
  const { state, toggleSidebar, width, setWidth, setResizing } = useSidebar();
  const expanded = state === "expanded";
  const dragRef = useRef<{ startX: number; startWidth: number; moved: boolean } | null>(null);
  const pendingToggleRef = useRef<number | null>(null);
  const lastTapRef = useRef(0);

  // Drop any scheduled single-tap toggle if the rail unmounts mid-gesture.
  useEffect(
    () => () => {
      if (pendingToggleRef.current !== null) window.clearTimeout(pendingToggleRef.current);
    },
    [],
  );

  function cancelPendingToggle() {
    if (pendingToggleRef.current !== null) {
      window.clearTimeout(pendingToggleRef.current);
      pendingToggleRef.current = null;
    }
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startWidth: width, moved: false };
    if (expanded) setResizing(true);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || !expanded) return;
    const delta = e.clientX - drag.startX;
    if (Math.abs(delta) > DRAG_THRESHOLD_PX) drag.moved = true;
    setWidth(drag.startWidth + delta);
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>): { moved: boolean } | null {
    const drag = dragRef.current;
    if (!drag) return null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    if (expanded) setResizing(false);
    return { moved: drag.moved };
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const result = endDrag(e);
    if (!result || result.moved) return;

    const now = Date.now();
    // Second tap inside the window → reset to the default width instead of toggling.
    if (pendingToggleRef.current !== null && now - lastTapRef.current < DOUBLE_TAP_MS) {
      cancelPendingToggle();
      lastTapRef.current = 0;
      if (expanded) setWidth(DEFAULT_SIDEBAR_WIDTH);
      return;
    }
    lastTapRef.current = now;

    if (!expanded) {
      toggleSidebar(); // collapsed: expand right away, nothing to double-tap for
      return;
    }
    // Defer the collapse so a follow-up tap can cancel it and reset instead.
    pendingToggleRef.current = window.setTimeout(() => {
      pendingToggleRef.current = null;
      toggleSidebar();
    }, DOUBLE_TAP_MS);
  }

  function handlePointerCancel(e: ReactPointerEvent<HTMLDivElement>) {
    endDrag(e);
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (!expanded) return; // only focusable while expanded
    const step = e.shiftKey ? KEYBOARD_STEP_LARGE_PX : KEYBOARD_STEP_PX;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        setWidth(width - step);
        break;
      case "ArrowRight":
        e.preventDefault();
        setWidth(width + step);
        break;
      case "Home":
        e.preventDefault();
        setWidth(MIN_SIDEBAR_WIDTH);
        break;
      case "End":
        e.preventDefault();
        setWidth(MAX_SIDEBAR_WIDTH);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        setWidth(DEFAULT_SIDEBAR_WIDTH);
        break;
      default:
        break;
    }
  }

  const separatorProps = expanded
    ? {
        role: "separator" as const,
        "aria-orientation": "vertical" as const,
        "aria-label": "Resize sidebar",
        "aria-valuenow": width,
        "aria-valuemin": MIN_SIDEBAR_WIDTH,
        "aria-valuemax": MAX_SIDEBAR_WIDTH,
        "aria-valuetext": `${width} pixels`,
        tabIndex: 0,
      }
    : { "aria-hidden": true as const, tabIndex: -1 };

  return (
    <div
      {...separatorProps}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
      className={[
        "sidebar-rail absolute -right-px top-0 z-[5] h-full w-2",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
        expanded ? "cursor-col-resize" : "cursor-pointer",
      ].join(" ")}
    />
  );
}
