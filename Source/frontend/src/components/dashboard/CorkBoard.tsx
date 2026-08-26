import { type ReactNode, type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { corkPanToScroll, corkScrollInnerLayout, corkScrollToPan, corkZoomAroundScreenPoint } from "../../lib/boardViewportScroll";
import { corkScreenToWorld, screenDeltaToWorldDelta } from "../../lib/boardViewportMath";
import { isWheelOverEditableText, wheelEventDeltaPixels } from "../../lib/boardWheelPan";
import { ZoomControls } from "./ZoomControls";
import { useTouchViewport } from "../../hooks/useTouchViewport";

export type CorkBoardBackgroundTheme = "whiteboard" | "blackboard" | "default";

interface CorkBoardProps {
  children: ReactNode;
  /** Renders inside the board frame, directly under the top wood edge (e.g. menu bar). */
  topBar?: ReactNode;
  /** Optional widget pinned to the bottom-right corner of the board (e.g. connected users). Should self-position with `absolute`. */
  presenceWidget?: ReactNode;
  boardRef?: React.RefObject<HTMLDivElement | null>;
  onDropItem?: (type: string, x: number, y: number) => void;
  /** Board-space (canvas) coords when mouse moves over the viewport */
  onBoardMouseMove?: (x: number, y: number) => void;
  onBoardMouseLeave?: () => void;
  /** Called when user clicks the board (receives event so handler can check if click was on background) */
  onBoardClick?: (e: React.MouseEvent) => void;
  zoom: number;
  panX: number;
  panY: number;
  onViewportChange: (zoom: number, panX: number, panY: number) => void;
  /** Background theme: whiteboard (light), blackboard (dark), or default (cork) */
  backgroundTheme?: CorkBoardBackgroundTheme;
  /** Called when user right-clicks on empty canvas (not on a board item). Use to show board-level context menu. */
  onBoardContextMenu?: (e: React.MouseEvent) => void;
  /** Canvas size (board expands with content when provided). If omitted, uses fixed 10000. */
  canvasWidth?: number;
  canvasHeight?: number;
  /** Offset so content at (contentMinX, contentMinY) aligns with scroll origin. */
  contentMinX?: number;
  contentMinY?: number;
  /** Ref to the scroll viewport (overflow surface) for parent measurements (e.g. menu zoom). */
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.0;
/** Zoom factor per "unit" of scroll; scaled by deltaY so zoom is proportional to scroll amount */
const ZOOM_STEP_PER_UNIT = 1.032;
/** Divisor for wheel exponent; smaller = faster zoom. Trackpads use pixel deltas. */
const ZOOM_DELTA_SCALE = 55;
const ZOOM_DELTA_SCALE_PIXEL = 30;
const ZOOM_EXPONENT_CAP = 2.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const DEFAULT_CANVAS_SIZE = 10000;

const SCROLL_EPS = 0.5;
const PAN_EPS = 1e-4;

/**
 * Clamp a scroll viewport's scrollLeft/Top so the canvas (the fixed board) can never be
 * scrolled past its own edges — i.e. no empty runway beyond the board, for any interaction
 * method (wheel, scrollbar drag, or cursor-drag panning, since all of them end up here).
 *
 * Reads the canvas element's actual rendered position via getBoundingClientRect() rather than
 * re-deriving the pan/scroll offset formula (see boardViewportScroll.ts) — that formula has a
 * documented `(zoom + 1)` quirk from the double-translate DOM shape that's easy to get subtly
 * wrong by hand; measuring the real rendered box sidesteps it entirely.
 */
function clampScrollToCanvas(
  viewport: HTMLDivElement,
  canvas: HTMLDivElement,
): { scrollLeft: number; scrollTop: number } {
  const viewportRect = viewport.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const canvasScrollLeft = viewport.scrollLeft + (canvasRect.left - viewportRect.left);
  const canvasScrollTop = viewport.scrollTop + (canvasRect.top - viewportRect.top);
  const maxScrollLeft = canvasScrollLeft + Math.max(0, canvasRect.width - viewport.clientWidth);
  const maxScrollTop = canvasScrollTop + Math.max(0, canvasRect.height - viewport.clientHeight);
  const clampedLeft = clamp(viewport.scrollLeft, canvasScrollLeft, maxScrollLeft);
  const clampedTop = clamp(viewport.scrollTop, canvasScrollTop, maxScrollTop);
  if (clampedLeft !== viewport.scrollLeft) viewport.scrollLeft = clampedLeft;
  if (clampedTop !== viewport.scrollTop) viewport.scrollTop = clampedTop;
  return { scrollLeft: viewport.scrollLeft, scrollTop: viewport.scrollTop };
}

export function CorkBoard({
  children,
  topBar,
  presenceWidget,
  boardRef,
  onDropItem,
  onBoardMouseMove,
  onBoardMouseLeave,
  onBoardClick,
  zoom,
  panX,
  panY,
  onViewportChange,
  backgroundTheme = "default",
  onBoardContextMenu,
  canvasWidth = DEFAULT_CANVAS_SIZE,
  canvasHeight = DEFAULT_CANVAS_SIZE,
  contentMinX = 0,
  contentMinY = 0,
  scrollContainerRef,
}: CorkBoardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  /** Ignore scroll events while applying scrollLeft/Top from React pan state */
  const syncingScrollFromPanRef = useRef(false);

  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  const zoomRef = useRef(zoom);
  const contentMinXRef = useRef(contentMinX);
  const contentMinYRef = useRef(contentMinY);
  panXRef.current = panX;
  panYRef.current = panY;
  zoomRef.current = zoom;
  contentMinXRef.current = contentMinX;
  contentMinYRef.current = contentMinY;

  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const setViewportNode = useCallback(
    (el: HTMLDivElement | null) => {
      (viewportRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      if (scrollContainerRef) {
        (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }
    },
    [scrollContainerRef],
  );

  const { scrollWidth, scrollHeight, canvasLeft, canvasTop } = corkScrollInnerLayout(
    canvasWidth,
    canvasHeight,
    zoom,
    contentMinX,
    contentMinY,
  );

  // Keep native scroll position aligned with pan/zoom from props (zoom, persistence, contentMin nudge, etc.)
  useLayoutEffect(() => {
    const el = viewportRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const { scrollLeft: sl, scrollTop: st } = corkPanToScroll(panX, panY, zoom, contentMinX, contentMinY);
    if (Math.abs(el.scrollLeft - sl) < SCROLL_EPS && Math.abs(el.scrollTop - st) < SCROLL_EPS) return;
    syncingScrollFromPanRef.current = true;
    el.scrollLeft = sl;
    el.scrollTop = st;
    // Clamp to the board's own edges — no scrolling into empty space beyond the fixed board —
    // then resync pan state to wherever we actually landed so state and the visible scroll
    // never diverge (e.g. a stale persisted pan, or a cursor-drag pan pushed past the edge).
    const { scrollLeft: clampedLeft, scrollTop: clampedTop } = clampScrollToCanvas(el, canvas);
    const { panX: clampedPanX, panY: clampedPanY } = corkScrollToPan(clampedLeft, clampedTop, zoom, contentMinX, contentMinY);
    if (Math.abs(clampedPanX - panX) > PAN_EPS || Math.abs(clampedPanY - panY) > PAN_EPS) {
      onViewportChangeRef.current(zoom, clampedPanX, clampedPanY);
    }
    queueMicrotask(() => {
      syncingScrollFromPanRef.current = false;
    });
  }, [panX, panY, zoom, scrollWidth, scrollHeight, contentMinX, contentMinY]);

  const handleViewportScroll = useCallback(() => {
    const el = viewportRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas || syncingScrollFromPanRef.current) return;
    const { scrollLeft: clampedLeft, scrollTop: clampedTop } = clampScrollToCanvas(el, canvas);
    const z = zoomRef.current;
    const { panX: nx, panY: ny } = corkScrollToPan(clampedLeft, clampedTop, z, contentMinXRef.current, contentMinYRef.current);
    if (Math.abs(nx - panXRef.current) < PAN_EPS && Math.abs(ny - panYRef.current) < PAN_EPS) return;
    onViewportChangeRef.current(z, nx, ny);
  }, []);

  // Bridge boardRef to point at the canvas div
  const setCanvasRef = useCallback(
    (el: HTMLDivElement | null) => {
      (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      if (boardRef) {
        (boardRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }
    },
    [boardRef],
  );

  // ---- Drag-and-drop (sidebar items) ----

  function handleDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes("application/board-item-type")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);

    const itemType = e.dataTransfer.getData("application/board-item-type");
    if (!itemType || !onDropItem) return;

    // Convert viewport screen coords to board (world) coords.
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const { x: canvasX, y: canvasY } = corkScreenToWorld(screenX, screenY, zoom, panX, panY, contentMinX, contentMinY);

    onDropItem(itemType, canvasX, canvasY);
  }

  const handleViewportMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect || !onBoardMouseMove) return;
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const { x, y } = corkScreenToWorld(screenX, screenY, zoom, panX, panY, contentMinX, contentMinY);
      onBoardMouseMove(x, y);
    },
    [zoom, panX, panY, contentMinX, contentMinY, onBoardMouseMove],
  );

  // ---- Wheel: Ctrl/Cmd + scroll = zoom; otherwise native scroll on this viewport pans ----
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function onWheel(e: WheelEvent) {
      // Zoom when Ctrl (or Cmd on Mac) is held — including pinch-zoom on trackpads
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        const z = zoomRef.current;
        const px = panXRef.current;
        const py = panYRef.current;
        const cmx = contentMinXRef.current;
        const cmy = contentMinYRef.current;

        const rect = viewport!.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const deltaScale =
          e.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? ZOOM_DELTA_SCALE_PIXEL : ZOOM_DELTA_SCALE;
        const exponent = Math.max(
          -ZOOM_EXPONENT_CAP,
          Math.min(ZOOM_EXPONENT_CAP, -e.deltaY / deltaScale),
        );
        const factor = Math.pow(ZOOM_STEP_PER_UNIT, exponent);
        const newZoom = clamp(z * factor, MIN_ZOOM, MAX_ZOOM);

        const { panX: newPanX, panY: newPanY } = corkZoomAroundScreenPoint(
          px,
          py,
          z,
          newZoom,
          mouseX,
          mouseY,
          cmx,
          cmy,
        );

        onViewportChangeRef.current(newZoom, newPanX, newPanY);
        return;
      }

      if (isWheelOverEditableText(e.target)) return;

      // Alt + wheel: convert vertical scroll into horizontal pan (mice without a horizontal wheel)
      if (e.altKey) {
        e.preventDefault();
        const { dy } = wheelEventDeltaPixels(e, viewport!);
        viewport!.scrollLeft += dy;
        return;
      }

      // Otherwise: let the overflow:auto viewport handle wheel / trackpad pan (onScroll updates pan)
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheel);
    };
  }, []);

  // ---- Pan (right-click drag, middle-click drag, or space + left-click drag) ----

  // Track whether right-click was used for panning so we can suppress the context menu
  const didRightPanRef = useRef(false);

  function handleMouseDown(e: React.MouseEvent) {
    // Don't start pan when right-clicking on a board item (let item show context menu)
    if (e.button === 2 && (e.target as Element).closest("[data-board-item]")) return;
    // Right mouse button (2), middle mouse button (1), or space+left click (0)
    if (e.button === 2 || e.button === 1 || (e.button === 0 && isSpaceHeld)) {
      e.preventDefault();
      setIsPanning(true);
      didRightPanRef.current = e.button === 2;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX,
        panY,
      };
    }
  }

  useEffect(() => {
    if (!isPanning) return;

    function onMouseMove(e: MouseEvent) {
      const start = panStartRef.current;
      if (!start) return;
      const { x: dx, y: dy } = screenDeltaToWorldDelta(e.clientX - start.x, e.clientY - start.y, zoom);
      onViewportChange(zoom, start.panX + dx, start.panY + dy);
    }

    function onMouseUp() {
      setIsPanning(false);
      panStartRef.current = null;
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isPanning, zoom, onViewportChange]);

  // Suppress context menu after right-click panning; show board menu on empty-area right-click
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function onContextMenu(e: MouseEvent) {
      if (didRightPanRef.current) {
        e.preventDefault();
        didRightPanRef.current = false;
        return;
      }
      if ((e.target as Element).closest("[data-board-item]")) return;
      e.preventDefault();
      onBoardContextMenu?.(e as unknown as React.MouseEvent);
    }

    viewport.addEventListener("contextmenu", onContextMenu);
    return () => viewport.removeEventListener("contextmenu", onContextMenu);
  }, [onBoardContextMenu]);

  // Track space bar for space-to-pan
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !e.repeat && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable)) {
        e.preventDefault();
        setIsSpaceHeld(true);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        setIsSpaceHeld(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // --- Touch pan and pinch zoom ---
  useTouchViewport(viewportRef, zoom, panX, panY, onViewportChange, {
    resolutionFactor: 1,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    contentMinX,
    contentMinY,
  });

  // ---- Zoom controls ----

  function zoomToCenter(newZoom: number) {
    const el = viewportRef.current;
    if (!el) {
      onViewportChange(newZoom, panX, panY);
      return;
    }
    const cx = el.clientWidth / 2;
    const cy = el.clientHeight / 2;
    const { panX: nx, panY: ny } = corkZoomAroundScreenPoint(
      panX,
      panY,
      zoom,
      newZoom,
      cx,
      cy,
      contentMinX,
      contentMinY,
    );
    onViewportChange(newZoom, nx, ny);
  }

  function handleZoomReset() {
    onViewportChange(1, 0, 0);
  }

  function handleCenterView() {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Center on the same area shown when board is first created (zoom=1, pan=0).
    // At creation, viewport center corresponds to canvas (rect.width/2, rect.height/2).
    const centerCanvasX = rect.width / 2;
    const centerCanvasY = rect.height / 2;
    const newPanX = rect.width / (2 * zoom) - centerCanvasX;
    const newPanY = rect.height / (2 * zoom) - centerCanvasY;
    onViewportChange(zoom, newPanX, newPanY);
  }

  const cursorClass = isPanning ? "cursor-grabbing" : isSpaceHeld ? "cursor-grab" : "";

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden corkboard-frame">
      {topBar ? (
        <div className="pointer-events-none absolute left-0 right-0 top-2 z-30 flex items-start px-2 sm:top-3 sm:px-3">
          <div className="notepad-card pointer-events-auto min-w-0 flex-1 !overflow-visible rounded-lg border border-black/10 shadow-md dark:border-white/10">
            <div className="notepad-spiral-strip" />
            <div className="flex w-full min-w-0 items-center gap-2 px-2 py-1.5 sm:gap-3 sm:px-3 sm:py-2">
              <div className="min-w-0 w-full flex-1">{topBar}</div>
            </div>
          </div>
        </div>
      ) : null}
      {presenceWidget}
      {/* Viewport: native scroll encodes pan (see boardViewportScroll); canvas has no translate(pan) */}
      <div
        ref={setViewportNode}
        className={[
          "corkboard-surface relative min-h-0 w-full flex-1 overflow-auto transition-shadow duration-150",
          backgroundTheme === "whiteboard" ? "corkboard-surface--whiteboard" : "",
          backgroundTheme === "blackboard" ? "corkboard-surface--blackboard" : "",
          isDragOver ? "ring-2 ring-inset ring-primary/40" : "",
          cursorClass,
        ].join(" ")}
        onScroll={handleViewportScroll}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseDown={handleMouseDown}
        onMouseMove={onBoardMouseMove ? handleViewportMouseMove : undefined}
        onMouseLeave={onBoardMouseLeave}
      >
        <div
          className="relative"
          style={{
            width: `${scrollWidth}px`,
            height: `${scrollHeight}px`,
          }}
        >
          <div
            ref={setCanvasRef}
            className="absolute origin-top-left overflow-hidden"
            style={{
              left: `${canvasLeft}px`,
              top: `${canvasTop}px`,
              transform: `translate(${-contentMinX}px, ${-contentMinY}px) scale(${zoom})`,
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
            }}
            onClick={(e) => {
              if (onBoardClick) onBoardClick(e);
            }}
          >
            <div
              style={{
                transform: `translate(${-contentMinX}px, ${-contentMinY}px)`,
                width: "100%",
                height: "100%",
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Zoom controls (above horizontal scrollbar) */}
      <div className="absolute bottom-8 left-4 z-20">
        <ZoomControls
          zoom={zoom}
          onZoomChange={zoomToCenter}
          onReset={handleZoomReset}
          onCenterView={handleCenterView}
        />
      </div>
    </div>
  );
}
