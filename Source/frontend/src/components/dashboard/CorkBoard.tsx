import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { isWheelOverEditableText, wheelEventDeltaPixels } from "../../lib/boardWheelPan";
import { ZoomControls } from "./ZoomControls";
import { useTouchViewport } from "../../hooks/useTouchViewport";

export type CorkBoardBackgroundTheme = "whiteboard" | "blackboard" | "default";

interface CorkBoardProps {
  children: ReactNode;
  /** Renders inside the board frame, directly under the top wood edge (e.g. menu bar). */
  topBar?: ReactNode;
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

export function CorkBoard({ children, topBar, boardRef, onDropItem, onBoardMouseMove, onBoardMouseLeave, onBoardClick, zoom, panX, panY, onViewportChange, backgroundTheme = "default", onBoardContextMenu, canvasWidth = DEFAULT_CANVAS_SIZE, canvasHeight = DEFAULT_CANVAS_SIZE, contentMinX = 0, contentMinY = 0 }: CorkBoardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);

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
    // Transform: screen = zoom*(world + pan) - contentMin*(zoom+1)  =>  world = (screen + contentMin*(zoom+1))/zoom - pan
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasX = (screenX + contentMinX * (zoom + 1)) / zoom - panX;
    const canvasY = (screenY + contentMinY * (zoom + 1)) / zoom - panY;

    onDropItem(itemType, canvasX, canvasY);
  }

  const handleViewportMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect || !onBoardMouseMove) return;
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const x = (screenX + contentMinX * (zoom + 1)) / zoom - panX;
      const y = (screenY + contentMinY * (zoom + 1)) / zoom - panY;
      onBoardMouseMove(x, y);
    },
    [zoom, panX, panY, contentMinX, contentMinY, onBoardMouseMove],
  );

  // ---- Wheel: Ctrl/Cmd + scroll = zoom; two-finger / trackpad scroll (or mouse wheel) = pan ----
  // Pan deltas are coalesced per animation frame so diagonal trackpad motion stays smooth (fewer React updates).

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const wheelPanAccum = { dx: 0, dy: 0 };
    let wheelPanRaf: number | null = null;

    function flushWheelPan() {
      wheelPanRaf = null;
      const dx = wheelPanAccum.dx;
      const dy = wheelPanAccum.dy;
      wheelPanAccum.dx = 0;
      wheelPanAccum.dy = 0;
      if (dx === 0 && dy === 0) return;
      const z = zoomRef.current;
      const nx = panXRef.current - dx / z;
      const ny = panYRef.current - dy / z;
      panXRef.current = nx;
      panYRef.current = ny;
      onViewportChangeRef.current(z, nx, ny);
    }

    function scheduleWheelPan() {
      if (wheelPanRaf !== null) return;
      wheelPanRaf = requestAnimationFrame(flushWheelPan);
    }

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

        const newPanX =
          px +
          (mouseX + cmx * (newZoom + 1)) / newZoom -
          (mouseX + cmx * (z + 1)) / z;
        const newPanY =
          py +
          (mouseY + cmy * (newZoom + 1)) / newZoom -
          (mouseY + cmy * (z + 1)) / z;

        onViewportChangeRef.current(newZoom, newPanX, newPanY);
        return;
      }

      if (isWheelOverEditableText(e.target)) return;

      const wheelEl = viewportRef.current;
      if (!wheelEl) return;
      const { dx, dy } = wheelEventDeltaPixels(e, wheelEl);
      if (dx === 0 && dy === 0) return;

      e.preventDefault();
      wheelPanAccum.dx += dx;
      wheelPanAccum.dy += dy;
      scheduleWheelPan();
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      if (wheelPanRaf !== null) cancelAnimationFrame(wheelPanRaf);
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
      const dx = (e.clientX - start.x) / zoom;
      const dy = (e.clientY - start.y) / zoom;
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
  });

  // ---- Zoom controls ----

  function zoomToCenter(newZoom: number) {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) {
      onViewportChange(newZoom, panX, panY);
      return;
    }
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const newPanX = panX + (centerX / newZoom - centerX / zoom);
    const newPanY = panY + (centerY / newZoom - centerY / zoom);
    onViewportChange(newZoom, newPanX, newPanY);
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
    <div className="relative flex h-full w-full flex-col corkboard-frame">
      {topBar ? (
        <div className="notepad-card relative z-30 shrink-0 !overflow-visible rounded-t-md rounded-b-none border-b-0 shadow-none">
          <div className="notepad-spiral-strip !border-b-0" />
          <div className="px-2 py-1.5 sm:px-3 sm:py-2">{topBar}</div>
        </div>
      ) : null}
      {/* Viewport (clips and captures events) */}
      <div
        ref={viewportRef}
        className={[
          "corkboard-surface relative min-h-0 w-full flex-1 overflow-hidden transition-shadow duration-150",
          backgroundTheme === "whiteboard" ? "corkboard-surface--whiteboard" : "",
          backgroundTheme === "blackboard" ? "corkboard-surface--blackboard" : "",
          isDragOver ? "ring-2 ring-inset ring-primary/40" : "",
          cursorClass,
        ].join(" ")}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseDown={handleMouseDown}
        onMouseMove={onBoardMouseMove ? handleViewportMouseMove : undefined}
        onMouseLeave={onBoardMouseLeave}
      >
        {/* Canvas (transformed layer) */}
        <div
          ref={setCanvasRef}
          className="absolute origin-top-left"
          style={{
            transform: `translate(${-contentMinX}px, ${-contentMinY}px) scale(${zoom}) translate(${panX}px, ${panY}px)`,
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
