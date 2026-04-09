import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import type { AppLayoutContext } from "../components/layout/AppLayout";
import { ChalkCanvas, CHALKBOARD_BG, RESOLUTION_FACTOR, type ChalkCanvasHandle } from "../components/chalkboard/ChalkCanvas";
import { ChalkToolbar, type ChalkMode, type ChalkTool } from "../components/chalkboard/ChalkToolbar";
import {
  BoardMenuBar,
  type BoardBackgroundTheme,
  type BoardRichTextToolbarState,
} from "../components/dashboard/BoardMenuBar";
import { BoardConnectedUsers } from "../components/dashboard/BoardConnectedUsers";
import { StickyNote } from "../components/dashboard/StickyNote";
import { ZoomControls } from "../components/dashboard/ZoomControls";
import { getBoardById } from "../api/boards";
import { getDrawing, saveDrawing } from "../api/drawings";
import { getNotes, createNote, patchNote, deleteNote } from "../api/notes";
import { useTouchViewport } from "../hooks/useTouchViewport";
import { useBoardRealtime, type BoardItemUpdatePayload } from "../hooks/useBoardRealtime";
import { getColorForUserId } from "../lib/presenceColors";
import {
  createBoardExportPayload,
  triggerBoardDownload,
  buildBoardExportFilename,
  parseBoardExportFile,
} from "../lib/boardExport";
import type { BoardSummaryDto, NoteSummaryDto } from "../types";
import { ContextMenu } from "../components/ui/ContextMenu";
import { Pencil, Copy, Trash2, Layers, StickyNote as StickyNoteIcon } from "lucide-react";

const MIN_ZOOM = 0.25;
const AUTO_SAVE_DELAY_MS = 300; // 300ms after last change for faster server sync
const MAX_ZOOM = 2.0;
/** Zoom factor per "unit" of scroll; scaled by deltaY so zoom is proportional to scroll amount */
const ZOOM_STEP_PER_UNIT = 1.028;
const ZOOM_DELTA_SCALE = 55;
const ZOOM_EXPONENT_CAP = 2.5;
const CHALK_WHITEBOARD_BG = "#faf9f6";
const CHALK_BLACKBOARD_BG = "#1a1a1a";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ChalkBoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { setBoardName, openBoard, setBoardPresence, connectedUsers } = useOutletContext<AppLayoutContext>();

  // --- Board & loading state ---
  const [board, setBoard] = useState<BoardSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Drawing state ---
  const canvasRef = useRef<ChalkCanvasHandle>(null);
  const [initialCanvasJson, setInitialCanvasJson] = useState<string | null>(null);

  // --- Notes state ---
  const [notes, setNotes] = useState<NoteSummaryDto[]>([]);
  const [editingNoteIds, setEditingNoteIds] = useState<Set<string>>(new Set());
  const [richTextToolbar, setRichTextToolbar] = useState<BoardRichTextToolbarState | null>(null);
  const primaryEditingNoteIdRef = useRef<string | null>(null);
  const noteNavAnchorRef = useRef<string | null>(null);
  const [remoteFocus, setRemoteFocus] = useState<Map<string, { userId: string; color: string }[]>>(new Map());
  const [remoteCursors, setRemoteCursors] = useState<Map<string, { x: number; y: number; color: string }>>(new Map());
  const cursorThrottleRef = useRef<{ last: number }>({ last: 0 });
  const CURSOR_THROTTLE_MS = 60;

  // --- Z-index stacking ---
  const [zIndexMap, setZIndexMap] = useState<Record<string, number>>({});
  const zCounterRef = useRef(1);

  // --- Note undo/redo stacks (position, size, deletion) ---
  type NoteUndoEntry =
    | { type: "position"; noteId: string; prevPositionX: number; prevPositionY: number }
    | { type: "size"; noteId: string; prevWidth: number | null; prevHeight: number | null }
    | { type: "delete"; note: NoteSummaryDto };
  type NoteRedoEntry =
    | { type: "position"; noteId: string; positionX: number; positionY: number }
    | { type: "size"; noteId: string; width: number; height: number }
    | { type: "delete"; noteId: string };
  const noteUndoStackRef = useRef<NoteUndoEntry[]>([]);
  const noteRedoStackRef = useRef<NoteRedoEntry[]>([]);
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const deletedNoteIdsRef = useRef<Set<string>>(new Set());

  function bringToFront(id: string) {
    const next = zCounterRef.current++;
    setZIndexMap((prev) => ({ ...prev, [id]: next }));
  }

  // --- Mode & tool state ---
  const [mode, setMode] = useState<ChalkMode>("draw");
  const [tool, setTool] = useState<ChalkTool>("pen");
  const [brushColor, setBrushColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(5);

  // --- Viewport state (zoom & pan) ---
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  panXRef.current = panX;
  panYRef.current = panY;

  // Fixed-size notes layer that expands when notes are placed or dragged outside current bounds.
  const CANVAS_PADDING = 300;
  const DEFAULT_CANVAS_SIZE = 2000;
  const NOTE_DEFAULT_SIZE = 270;
  const POSITION_DEFAULT = 20;
  const chalkNotesBounds = useMemo(() => {
    let maxX = DEFAULT_CANVAS_SIZE;
    let maxY = DEFAULT_CANVAS_SIZE;
    for (const n of notes) {
      const x = n.positionX ?? POSITION_DEFAULT;
      const y = n.positionY ?? POSITION_DEFAULT;
      const w = n.width ?? NOTE_DEFAULT_SIZE;
      const h = n.height ?? NOTE_DEFAULT_SIZE;
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }
    // Keep note-space origin aligned with drawing-space origin (0,0) so notes
    // can always be placed directly over drawings without drifting past an
    // implicit negative-offset boundary.
    const contentMinX = 0;
    const contentMinY = 0;
    const canvasWidth = Math.max(DEFAULT_CANVAS_SIZE, maxX + CANVAS_PADDING);
    const canvasHeight = Math.max(DEFAULT_CANVAS_SIZE, maxY + CANVAS_PADDING);
    return { contentMinX, contentMinY, canvasWidth, canvasHeight };
  }, [notes]);

  const [isPanning, setIsPanning] = useState(false);
  const [isTouchPanning, setIsTouchPanning] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const didRightPanRef = useRef(false);
  const [boardContextMenu, setBoardContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [itemContextMenu, setItemContextMenu] = useState<{ x: number; y: number; note: NoteSummaryDto } | null>(null);
  const loadFileInputRef = useRef<HTMLInputElement>(null);

  const handleRichTextToolbarChange = useCallback(
    (state: BoardRichTextToolbarState | null, clearedSourceId?: string) => {
      if (state === null && clearedSourceId !== undefined) {
        setRichTextToolbar((prev) => (prev?.sourceId === clearedSourceId ? null : prev));
        return;
      }
      if (state === null) {
        setRichTextToolbar(null);
        return;
      }
      setRichTextToolbar((prev) => {
        if (prev && prev.sourceId === state.sourceId && prev.editor === state.editor) {
          return prev;
        }
        return state;
      });
    },
    [],
  );

  // --- ChalkBoard UI preferences (persist in localStorage) ---
  const [backgroundTheme, setBackgroundTheme] = useState<BoardBackgroundTheme>(() => {
    if (!boardId) return "default";
    try {
      const saved = localStorage.getItem(`chalkboard-theme-${boardId}`);
      if (saved === "whiteboard" || saved === "blackboard" || saved === "default") return saved;
    } catch {
      // ignore
    }
    return "default";
  });
  const [autoEnlargeNotes, setAutoEnlargeNotes] = useState(() => {
    if (!boardId) return true;
    try {
      return localStorage.getItem(`board-auto-enlarge-${boardId}`) !== "0";
    } catch {
      return true;
    }
  });

  // Restore viewport from localStorage on mount
  useEffect(() => {
    if (!boardId) return;
    try {
      const saved = localStorage.getItem(`board-viewport-${boardId}`);
      if (saved) {
        const { zoom: z, panX: px, panY: py } = JSON.parse(saved);
        if (typeof z === "number") setZoom(z);
        if (typeof px === "number") setPanX(px);
        if (typeof py === "number") setPanY(py);
      }
    } catch {
      // ignore parse errors
    }
  }, [boardId]);

  // Persist viewport to localStorage (debounced)
  const viewportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!boardId) return;
    if (viewportTimerRef.current) clearTimeout(viewportTimerRef.current);
    viewportTimerRef.current = setTimeout(() => {
      localStorage.setItem(`board-viewport-${boardId}`, JSON.stringify({ zoom, panX, panY }));
    }, 300);
    return () => {
      if (viewportTimerRef.current) clearTimeout(viewportTimerRef.current);
    };
  }, [boardId, zoom, panX, panY]);

  // Sync backgroundTheme and autoEnlargeNotes when boardId changes
  useEffect(() => {
    if (!boardId) return;
    try {
      const theme = localStorage.getItem(`chalkboard-theme-${boardId}`);
      if (theme === "whiteboard" || theme === "blackboard" || theme === "default") {
        setBackgroundTheme(theme);
      }
      setAutoEnlargeNotes(localStorage.getItem(`board-auto-enlarge-${boardId}`) !== "0");
    } catch {
      // ignore
    }
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;
    try {
      localStorage.setItem(`chalkboard-theme-${boardId}`, backgroundTheme);
    } catch {
      // ignore
    }
  }, [boardId, backgroundTheme]);

  useEffect(() => {
    if (!boardId) return;
    try {
      localStorage.setItem(`board-auto-enlarge-${boardId}`, autoEnlargeNotes ? "1" : "0");
    } catch {
      // ignore
    }
  }, [boardId, autoEnlargeNotes]);

  function handleViewportChange(newZoom: number, newPanX: number, newPanY: number) {
    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
  }

  function getViewportCenterInBoardCoords() {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: 400, y: 300 };
    const centerScreenX = rect.width / 2;
    const centerScreenY = rect.height / 2;
    const x = (centerScreenX + chalkNotesBounds.contentMinX) * (RESOLUTION_FACTOR / zoom) - panX;
    const y = (centerScreenY + chalkNotesBounds.contentMinY) * (RESOLUTION_FACTOR / zoom) - panY;
    return { x, y };
  }

  function panViewportToBoardPoint(centerX: number, centerY: number) {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerScreenX = rect.width / 2;
    const centerScreenY = rect.height / 2;
    const newPanX = (centerScreenX + chalkNotesBounds.contentMinX) * (RESOLUTION_FACTOR / zoom) - centerX;
    const newPanY = (centerScreenY + chalkNotesBounds.contentMinY) * (RESOLUTION_FACTOR / zoom) - centerY;
    handleViewportChange(zoom, newPanX, newPanY);
  }

  function getStickyNoteCenter(n: NoteSummaryDto) {
    const x = n.positionX ?? POSITION_DEFAULT;
    const y = n.positionY ?? POSITION_DEFAULT;
    const w = n.width ?? NOTE_DEFAULT_SIZE;
    const h = n.height ?? NOTE_DEFAULT_SIZE;
    return { x: x + w / 2, y: y + h / 2 };
  }

  function sortNotesByCreatedAt(list: NoteSummaryDto[]) {
    return [...list].sort((a, b) => {
      const t = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (t !== 0) return t;
      return a.id.localeCompare(b.id);
    });
  }

  function navigateRelativeNote(delta: -1 | 1) {
    const sorted = sortNotesByCreatedAt(notes);
    if (sorted.length === 0) return;
    const n = sorted.length;
    let idx = 0;
    const openNoteId = primaryEditingNoteIdRef.current;
    let navigatedFromOpenNote = false;
    if (openNoteId && sorted.some((note) => note.id === openNoteId)) {
      idx = sorted.findIndex((note) => note.id === openNoteId);
      navigatedFromOpenNote = true;
    } else {
      const anchor = noteNavAnchorRef.current;
      if (anchor && sorted.some((note) => note.id === anchor)) {
        idx = sorted.findIndex((note) => note.id === anchor);
      } else {
        const vp = getViewportCenterInBoardCoords();
        let best = 0;
        let bestD = Infinity;
        sorted.forEach((note, i) => {
          const c = getStickyNoteCenter(note);
          const d = (c.x - vp.x) ** 2 + (c.y - vp.y) ** 2;
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        idx = best;
      }
    }
    const nextIdx = ((idx + delta) % n + n) % n;
    const target = sorted[nextIdx];
    noteNavAnchorRef.current = target.id;
    const c = getStickyNoteCenter(target);
    panViewportToBoardPoint(c.x, c.y);
    if (navigatedFromOpenNote) {
      setEditingNoteIds(new Set([target.id]));
      primaryEditingNoteIdRef.current = target.id;
      bringToFront(target.id);
    }
  }

  function handleNavigatePreviousNote() {
    navigateRelativeNote(-1);
  }

  function handleNavigateNextNote() {
    navigateRelativeNote(1);
  }

  // --- Wheel zoom (Ctrl/Cmd + scroll) ---
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const rect = viewport!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const exponent = Math.max(
        -ZOOM_EXPONENT_CAP,
        Math.min(ZOOM_EXPONENT_CAP, -e.deltaY / ZOOM_DELTA_SCALE),
      );
      const factor = Math.pow(ZOOM_STEP_PER_UNIT, exponent);
      const newZoom = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const vpScale = zoom / RESOLUTION_FACTOR;
      const newVpScale = newZoom / RESOLUTION_FACTOR;

      // Keep point under cursor fixed (same formula as Note Board CorkBoard)
      const newPanX = panX + mouseX * (1 / newVpScale - 1 / vpScale);
      const newPanY = panY + mouseY * (1 / newVpScale - 1 / vpScale);

      handleViewportChange(newZoom, newPanX, newPanY);
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [zoom, panX, panY]);

  // --- Pan (right-click, middle-click, space+left drag) ---
  function handleViewportMouseDown(e: React.MouseEvent) {
    if (e.button === 2 && (e.target as Element).closest("[data-board-item]")) return;
    if (e.button === 2 || e.button === 1 || (e.button === 0 && isSpaceHeld)) {
      e.preventDefault();
      setIsPanning(true);
      didRightPanRef.current = e.button === 2;
      panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };

      // Temporarily disable drawing while panning
      if (mode === "draw" && isSpaceHeld) {
        canvasRef.current?.setDrawingMode(false);
      }
    }
  }

  useEffect(() => {
    if (!isPanning) return;

    function onMouseMove(e: MouseEvent) {
      const start = panStartRef.current;
      if (!start) return;
      const dx = RESOLUTION_FACTOR * (e.clientX - start.x) / zoom;
      const dy = RESOLUTION_FACTOR * (e.clientY - start.y) / zoom;
      handleViewportChange(zoom, start.panX + dx, start.panY + dy);
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
  }, [isPanning, zoom]);

  // Re-enable drawing after panning ends (mouse or touch)
  useEffect(() => {
    if (!isPanning && !isTouchPanning && mode === "draw") {
      if (tool === "eraser") {
        canvasRef.current?.setEraserMode(true);
      } else {
        canvasRef.current?.setDrawingMode(true);
      }
    }
  }, [isPanning, isTouchPanning, mode, tool]);

  // Suppress context menu after right-click pan; show board menu on empty-area right-click
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
      setBoardContextMenu({ x: e.clientX, y: e.clientY });
    }

    viewport.addEventListener("contextmenu", onContextMenu);
    return () => viewport.removeEventListener("contextmenu", onContextMenu);
  }, []);

  // Close edit mode when clicking anywhere except the editing note
  useEffect(() => {
    function handleDocumentMouseDown(e: MouseEvent) {
      const primaryNote = primaryEditingNoteIdRef.current;
      if (!primaryNote) return;

      const target = e.target as Element;
      if (target.closest("[data-board-toolbar-portal]")) return;
      if (target.closest("[data-board-menu-bar]")) return;
      const noteEl = target.closest("[data-board-item='note'][data-note-id]");
      if (noteEl?.getAttribute("data-note-id") === primaryNote) return;

      setEditingNoteIds(new Set());
      primaryEditingNoteIdRef.current = null;
      setRichTextToolbar(null);
    }
    document.addEventListener("mousedown", handleDocumentMouseDown, true);
    return () => document.removeEventListener("mousedown", handleDocumentMouseDown, true);
  }, []);

  // --- Touch pan and pinch zoom ---
  useTouchViewport(
    viewportRef,
    zoom,
    panX,
    panY,
    handleViewportChange,
    {
      resolutionFactor: RESOLUTION_FACTOR,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      onTouchPanStart: () => {
        setIsTouchPanning(true);
        // Disable drawing while touch panning
        if (mode === "draw") {
          canvasRef.current?.setDrawingMode(false);
        }
      },
      onTouchPanEnd: () => {
        setIsTouchPanning(false);
      },
    },
  );

  // Track space bar for space-to-pan
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.code === "Space" &&
        !e.repeat &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target as HTMLElement)?.isContentEditable
        )
      ) {
        e.preventDefault();
        setIsSpaceHeld(true);
        // Temporarily disable drawing so left-click can pan
        if (mode === "draw") {
          canvasRef.current?.setDrawingMode(false);
        }
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        setIsSpaceHeld(false);
        // Re-enable drawing
        if (mode === "draw") {
          if (tool === "eraser") {
            canvasRef.current?.setEraserMode(true);
          } else {
            canvasRef.current?.setDrawingMode(true);
          }
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [mode, tool]);

  // --- Zoom controls ---
  function zoomToCenter(newZoom: number) {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) {
      handleViewportChange(newZoom, panX, panY);
      return;
    }
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const vpScale = zoom / RESOLUTION_FACTOR;
    const newVpScale = newZoom / RESOLUTION_FACTOR;
    const newPanX = panX + centerX * (1 / newVpScale - 1 / vpScale);
    const newPanY = panY + centerY * (1 / newVpScale - 1 / vpScale);
    handleViewportChange(newZoom, newPanX, newPanY);
  }

  function handleZoomReset() {
    handleViewportChange(1, 0, 0);
  }

  function handleCenterView() {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vpScale = zoom / RESOLUTION_FACTOR;
    // Center on the same area shown when board is first created (zoom=1, pan=0).
    // At creation, viewport center corresponds to canvas (rect.width, rect.height) due to vpScale=0.5.
    const centerCanvasX = rect.width;
    const centerCanvasY = rect.height;
    const newPanX = rect.width / (2 * vpScale) - centerCanvasX;
    const newPanY = rect.height / (2 * vpScale) - centerCanvasY;
    handleViewportChange(zoom, newPanX, newPanY);
  }

  // --- Drag-and-drop from sidebar ---
  const [isDragOver, setIsDragOver] = useState(false);

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
    if (!itemType || itemType !== "sticky-note") return;

    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const canvasX = RESOLUTION_FACTOR * (e.clientX - rect.left) / zoom - panX;
    const canvasY = RESOLUTION_FACTOR * (e.clientY - rect.top) / zoom - panY;

    handleAddStickyNoteAt(canvasX, canvasY);
  }

  // --- Auto-save drawing (debounced) ---
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveAtRef = useRef<number>(0);
  const DRAWING_ECHO_IGNORE_MS = 2500;

  const flushSave = useCallback(() => {
    if (!boardId || !canvasRef.current) return;
    const json = canvasRef.current.toJSON();
    if (json) {
      lastSaveAtRef.current = Date.now();
      saveDrawing(boardId, { canvasJson: json }).catch(() => {
        // Silently fail
      });
    }
  }, [boardId]);

  const handleCanvasChange = useCallback(() => {
    if (!boardId || !canvasRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      flushSave();
    }, AUTO_SAVE_DELAY_MS);
  }, [boardId, flushSave]);

  // Cleanup: flush pending save on unmount so data is not lost when navigating away
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        flushSave();
      }
    };
  }, [flushSave]);

  // --- Fetch all data on mount ---
  const fetchData = useCallback(async () => {
    if (!boardId) return;
    try {
      setError(null);
      const [boardRes, drawingRes, notesRes] = await Promise.allSettled([
        getBoardById(boardId),
        getDrawing(boardId),
        getNotes({ boardId, limit: 100 }),
      ]);

      if (boardRes.status === "fulfilled") {
        setBoard(boardRes.value);
      }
      if (drawingRes.status === "fulfilled") {
        // Skip overwriting local canvas right after we saved — we triggered DrawingUpdated
        // and our local state is source of truth; avoids disappear/reappear flicker
        if (Date.now() - lastSaveAtRef.current >= DRAWING_ECHO_IGNORE_MS) {
          const canvasJson = drawingRes.value.canvasJson;
          setInitialCanvasJson(canvasJson && canvasJson !== "{}" ? canvasJson : null);
        }
      }
      if (notesRes.status === "fulfilled") {
        const items = notesRes.value.items;
        const newNoteIds = items.map((n) => n.id);
        const serverIds = new Set(newNoteIds);
        const removedIds: string[] = [];
        for (const n of notesRef.current) {
          if (!serverIds.has(n.id)) {
            removedIds.push(n.id);
            deletedNoteIdsRef.current.add(n.id);
            setTimeout(() => deletedNoteIdsRef.current.delete(n.id), 2000);
          }
        }
        if (removedIds.length > 0) {
          setEditingNoteIds((prev) => {
            const next = new Set(prev);
            for (const id of removedIds) next.delete(id);
            return next.size === prev.size ? prev : next;
          });
          if (primaryEditingNoteIdRef.current && removedIds.includes(primaryEditingNoteIdRef.current)) {
            primaryEditingNoteIdRef.current = null;
          }
        }
        // Migrate old-format note positions (1x coords) to virtual canvas coords.
        // Old format: positions typically < 1200x900. New format uses 2x range.
        const migrated = items.map((n) => {
          const px = n.positionX ?? 0;
          const py = n.positionY ?? 0;
          const isOldFormat = px <= 1200 && py <= 900;
          if (isOldFormat) {
            return {
              ...n,
              positionX: px * RESOLUTION_FACTOR,
              positionY: py * RESOLUTION_FACTOR,
            };
          }
          return n;
        });
        setNotes(migrated);
      }

      if (
        boardRes.status === "rejected" &&
        drawingRes.status === "rejected" &&
        notesRes.status === "rejected"
      ) {
        setError("Failed to load board.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const draggingNoteIdRef = useRef<string | null>(null);
  const RESIZE_ECHO_IGNORE_MS = 400;
  const lastResizedNoteRef = useRef<{ id: string; at: number } | null>(null);
  const mergeNotePayload = useCallback((payload: BoardItemUpdatePayload) => {
    const id = String(payload.id);
    const skipPosition = id === draggingNoteIdRef.current;
    const skipSize =
      lastResizedNoteRef.current?.id === id &&
      Date.now() - lastResizedNoteRef.current.at < RESIZE_ECHO_IGNORE_MS;
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const next = { ...n };
        if (!skipPosition && payload.positionX !== undefined) next.positionX = payload.positionX;
        if (!skipPosition && payload.positionY !== undefined) next.positionY = payload.positionY;
        if (payload.title !== undefined) next.title = payload.title;
        if (payload.content !== undefined && payload.content !== null) next.content = payload.content;
        if (!skipSize && payload.width !== undefined) next.width = payload.width;
        if (!skipSize && payload.height !== undefined) next.height = payload.height;
        if (payload.color !== undefined) next.color = payload.color;
        if (payload.rotation !== undefined) next.rotation = payload.rotation;
        return next;
      }),
    );
  }, []);

  const handleUserFocusingItem = useCallback((userId: string, itemType: string, itemId: string | null) => {
    setRemoteFocus((prev) => {
      const next = new Map(prev);
      const color = getColorForUserId(userId);
      const entry = { userId, color };
      for (const [key, list] of next) {
        const filtered = list.filter((u) => u.userId !== userId);
        if (filtered.length === 0) next.delete(key);
        else next.set(key, filtered);
      }
      if (itemId && itemType === "note") {
        const key = `note:${itemId}`;
        const existing = next.get(key) ?? [];
        if (!existing.some((u) => u.userId === userId)) next.set(key, [...existing, entry]);
      }
      return next;
    });
  }, []);

  const handleCursorPosition = useCallback((userId: string, x: number, y: number) => {
    setRemoteCursors((prev) => {
      const next = new Map(prev);
      if (x < 0 || y < 0) next.delete(userId);
      else next.set(userId, { x, y, color: getColorForUserId(userId) });
      return next;
    });
  }, []);

  const { sendFocus, sendCursor } = useBoardRealtime(boardId ?? undefined, fetchData, {
    enabled: !!board?.projectId,
    onNoteUpdated: mergeNotePayload,
    onPresenceUpdate: setBoardPresence,
    onUserFocusingItem: handleUserFocusingItem,
    onCursorPosition: handleCursorPosition,
  });

  useEffect(() => {
    const primary = primaryEditingNoteIdRef.current;
    if (primary) sendFocus("note", primary);
    else sendFocus("note", null);
  }, [editingNoteIds, sendFocus]);

  const handleChalkBoardMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;
      const now = Date.now();
      if (now - cursorThrottleRef.current.last < CURSOR_THROTTLE_MS) return;
      cursorThrottleRef.current.last = now;
      const x = RESOLUTION_FACTOR * (e.clientX - rect.left) / zoom - panX;
      const y = RESOLUTION_FACTOR * (e.clientY - rect.top) / zoom - panY;
      sendCursor(x, y);
    },
    [zoom, panX, panY, sendCursor],
  );
  const handleChalkBoardMouseLeave = useCallback(() => {
    sendCursor(-1, -1);
  }, [sendCursor]);

  const DRAG_THROTTLE_MS = 120;
  type DragPending = { x: number; y: number; timer: ReturnType<typeof setTimeout> };
  const noteDragMapRef = useRef<Map<string, DragPending>>(new Map());
  const handleNoteDrag = useCallback((id: string, x: number, y: number) => {
    const map = noteDragMapRef.current;
    let entry = map.get(id);
    if (!entry) {
      entry = {
        x,
        y,
        timer: setTimeout(() => {
          const e = map.get(id);
          if (e && !deletedNoteIdsRef.current.has(id) && notesRef.current.some((n) => n.id === id)) {
            patchNote(id, { positionX: e.x, positionY: e.y }).catch(() => {});
          }
          map.delete(id);
        }, DRAG_THROTTLE_MS),
      };
      map.set(id, entry);
    } else {
      entry.x = x;
      entry.y = y;
    }
  }, []);

  // Load canvas JSON after initial fetch
  useEffect(() => {
    if (initialCanvasJson && canvasRef.current) {
      canvasRef.current.loadFromJSON(initialCanvasJson);
      setInitialCanvasJson(null);
    }
  }, [initialCanvasJson]);

  // Push board name to navbar
  useEffect(() => {
    setBoardName(board?.name ?? null);
    return () => setBoardName(null);
  }, [board?.name, setBoardName]);

  // Register this board in the "Opened Boards" sidebar section
  useEffect(() => {
    if (board) {
      openBoard({ id: board.id, name: board.name, boardType: board.boardType });
    }
  }, [board, openBoard]);

  // Listen for sidebar tool clicks
  useEffect(() => {
    function onToolClick(e: Event) {
      const type = (e as CustomEvent).detail?.type as string | undefined;
      if (type === "sticky-note") {
        handleAddStickyNote();
      }
    }
    document.addEventListener("board-tool-click", onToolClick);
    return () => document.removeEventListener("board-tool-click", onToolClick);
  });

  // Ctrl+Z undo / Ctrl+Y redo for drawing (draw mode) or notes (select mode)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        (!e.ctrlKey && !e.metaKey) ||
        e.repeat ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      const isUndo = e.key === "z";
      const isRedo = e.key === "y";
      if (!isUndo && !isRedo) return;

      // In draw mode: canvas undo/redo
      if (mode === "draw") {
        e.preventDefault();
        if (isUndo) canvasRef.current?.undo();
        else canvasRef.current?.redo();
        return;
      }

      if (isUndo) {
        const stack = noteUndoStackRef.current;
        if (stack.length === 0) return;
        e.preventDefault();
        const entry = stack.pop()!;
        if (entry.type === "position") {
          const current = notesRef.current.find((n) => n.id === entry.noteId);
          if (current) {
            noteRedoStackRef.current.push({
              type: "position",
              noteId: entry.noteId,
              positionX: current.positionX ?? 0,
              positionY: current.positionY ?? 0,
            });
          }
          setNotes((prev) =>
            prev.map((n) =>
              n.id === entry.noteId
                ? { ...n, positionX: entry.prevPositionX, positionY: entry.prevPositionY }
                : n,
            ),
          );
          patchNote(entry.noteId, {
            positionX: entry.prevPositionX,
            positionY: entry.prevPositionY,
          }).catch(() => {});
        } else if (entry.type === "size") {
          const current = notesRef.current.find((n) => n.id === entry.noteId);
          if (current) {
            noteRedoStackRef.current.push({
              type: "size",
              noteId: entry.noteId,
              width: current.width ?? 270,
              height: current.height ?? 270,
            });
          }
          const w = entry.prevWidth ?? 270;
          const h = entry.prevHeight ?? 270;
          setNotes((prev) =>
            prev.map((n) =>
              n.id === entry.noteId ? { ...n, width: w, height: h } : n,
            ),
          );
          patchNote(entry.noteId, { width: w, height: h }).catch(() => {});
        } else {
          createNote({
            content: entry.note.content,
            boardId: boardId ?? undefined,
            title: entry.note.title ?? undefined,
            positionX: entry.note.positionX ?? 20,
            positionY: entry.note.positionY ?? 20,
            width: entry.note.width ?? undefined,
            height: entry.note.height ?? undefined,
            color: entry.note.color ?? undefined,
            rotation: entry.note.rotation ?? undefined,
          })
            .then((created) => {
              noteRedoStackRef.current.push({ type: "delete", noteId: created.id });
              setNotes((prev) => [...prev, created]);
            })
            .catch(() => {});
        }
      } else {
        const stack = noteRedoStackRef.current;
        if (stack.length === 0) return;
        e.preventDefault();
        const entry = stack.pop()!;
        if (entry.type === "position") {
          setNotes((prev) =>
            prev.map((n) =>
              n.id === entry.noteId
                ? { ...n, positionX: entry.positionX, positionY: entry.positionY }
                : n,
            ),
          );
          patchNote(entry.noteId, {
            positionX: entry.positionX,
            positionY: entry.positionY,
          }).catch(() => {});
        } else if (entry.type === "size") {
          setNotes((prev) =>
            prev.map((n) =>
              n.id === entry.noteId ? { ...n, width: entry.width, height: entry.height } : n,
            ),
          );
          patchNote(entry.noteId, { width: entry.width, height: entry.height }).catch(() => {});
        } else {
          setNotes((prev) => prev.filter((n) => n.id !== entry.noteId));
          setEditingNoteIds((prev) => {
            const next = new Set(prev);
            next.delete(entry.noteId);
            if (primaryEditingNoteIdRef.current === entry.noteId) {
              primaryEditingNoteIdRef.current = next.size ? next.values().next().value ?? null : null;
            }
            return next;
          });
          deleteNote(entry.noteId).catch(() => fetchData());
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [boardId, fetchData, mode]);

  // --- File save/load and menu actions ---
  function handleSaveToFile() {
    const canvasJson = canvasRef.current?.toJSON() ?? "{}";
    const payload = createBoardExportPayload("ChalkBoard", board?.name ?? "Chalk Board", {
      notes,
      drawing: { canvasJson },
      viewport: { zoom, panX, panY },
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    triggerBoardDownload(blob, buildBoardExportFilename(board?.name ?? "chalk-board"));
  }

  function handleLoadFromFile() {
    loadFileInputRef.current?.click();
  }

  async function handleLoadFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !boardId) return;
    try {
      const text = await file.text();
      const payload = parseBoardExportFile(text);
      if (!payload || payload.boardType !== "ChalkBoard") {
        return;
      }
      setEditingNoteIds(new Set());
      primaryEditingNoteIdRef.current = null;
      const idMap = new Map<string, string>();

      // Delete existing notes
      for (const note of notes) {
        try {
          await deleteNote(note.id);
        } catch {
          // ignore
        }
      }

      // Restore drawing
      if (payload.drawing?.canvasJson) {
        if (canvasRef.current) {
          await canvasRef.current.loadFromJSON(payload.drawing.canvasJson);
        }
        await saveDrawing(boardId, { canvasJson: payload.drawing.canvasJson });
      }

      // Create notes
      for (const n of payload.notes ?? []) {
        const created = await createNote({
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
        idMap.set(n.id, created.id);
      }

      if (payload.viewport) {
        setZoom(payload.viewport.zoom);
        setPanX(payload.viewport.panX);
        setPanY(payload.viewport.panY);
      }

      await fetchData();
    } catch {
      // Load failed
    }
  }

  function triggerMenuUndo() {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true })
    );
  }

  function triggerMenuRedo() {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "y", ctrlKey: true, bubbles: true })
    );
  }

  // --- Mode & tool handlers ---
  function handleModeChange(newMode: ChalkMode) {
    setMode(newMode);
    if (newMode === "draw") {
      setEditingNoteIds(new Set());
      primaryEditingNoteIdRef.current = null;
      setRichTextToolbar(null);
      canvasRef.current?.setDrawingMode(true);
      if (tool === "eraser") {
        canvasRef.current?.setEraserMode(true);
      }
    } else {
      canvasRef.current?.setDrawingMode(false);
    }
  }

  function handleToolChange(newTool: ChalkTool) {
    setTool(newTool);
    if (newTool === "eraser") {
      canvasRef.current?.setEraserMode(true);
    } else {
      canvasRef.current?.setEraserMode(false);
      canvasRef.current?.setBrushColor(brushColor);
    }
  }

  function handleBrushColorChange(color: string) {
    setBrushColor(color);
    canvasRef.current?.setBrushColor(color);
  }

  function handleBrushSizeChange(size: number) {
    setBrushSize(size);
    canvasRef.current?.setBrushSize(size);
  }

  // --- Sticky note handlers ---
  async function handleAddStickyNote() {
    // Place near center of current viewport
    const rect = viewportRef.current?.getBoundingClientRect();
    const centerX = rect ? RESOLUTION_FACTOR * (rect.width / 2) / zoom - panX : 400;
    const centerY = rect ? RESOLUTION_FACTOR * (rect.height / 2) / zoom - panY : 300;
    const positionX = centerX - 135 + Math.random() * 100;
    const positionY = centerY - 135 + Math.random() * 100;
    await handleAddStickyNoteAt(positionX, positionY);
  }

  async function handleAddStickyNoteAt(positionX: number, positionY: number) {
    if (!boardId) return;
    try {
      const created = await createNote({
        content: "",
        boardId,
        positionX,
        positionY,
      });

      setNotes((prev) => [created, ...prev]);
      setEditingNoteIds((prev) => new Set(prev).add(created.id));
      primaryEditingNoteIdRef.current = created.id;
      setMode("select");
      setRichTextToolbar(null);
      canvasRef.current?.setDrawingMode(false);
    } catch {
      // Silently fail
    }
  }

  function handleNoteDragStart(id: string) {
    draggingNoteIdRef.current = id;
  }
  const DRAG_ECHO_IGNORE_MS = 280;
  async function handleDragStop(id: string, x: number, y: number) {
    const pending = noteDragMapRef.current.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      noteDragMapRef.current.delete(id);
    }
    if (deletedNoteIdsRef.current.has(id)) return;
    if (!notesRef.current.some((n) => n.id === id)) return;
    const prevNote = notesRef.current.find((n) => n.id === id);
    if (prevNote && (prevNote.positionX !== x || prevNote.positionY !== y)) {
      noteRedoStackRef.current = [];
      noteUndoStackRef.current.push({
        type: "position",
        noteId: id,
        prevPositionX: prevNote.positionX ?? 0,
        prevPositionY: prevNote.positionY ?? 0,
      });
    }
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, positionX: x, positionY: y } : n)),
    );
    window.setTimeout(() => {
      if (draggingNoteIdRef.current === id) draggingNoteIdRef.current = null;
    }, DRAG_ECHO_IGNORE_MS);
    try {
      if (deletedNoteIdsRef.current.has(id) || !notesRef.current.some((n) => n.id === id)) return;
      await patchNote(id, { positionX: x, positionY: y });
    } catch {
      // Silently fail
    }
  }

  async function handleSave(id: string, title: string, content: string) {
    setEditingNoteIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      if (primaryEditingNoteIdRef.current === id) {
        primaryEditingNoteIdRef.current = next.size ? next.values().next().value ?? null : null;
      }
      return next;
    });
    setRichTextToolbar((prev) => (prev?.sourceId === id ? null : prev));
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, title: title || null, content } : n,
      ),
    );
    try {
      await patchNote(id, {
        patchTitle: true,
        title: title || null,
        content: content || undefined,
      });
    } catch {
      // Silently fail
    }
  }

  async function handleNoteContentChange(id: string, title: string, content: string) {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, title: title || null, content } : n,
      ),
    );
    try {
      await patchNote(id, {
        patchTitle: true,
        title: title || null,
        content: content || undefined,
      });
    } catch {
      // Silently fail
    }
  }

  const handleNoteUnmount = useCallback((id: string) => {
    deletedNoteIdsRef.current.add(id);
    setTimeout(() => deletedNoteIdsRef.current.delete(id), 2000);
  }, []);

  function handleExitEditNote(id: string) {
    setEditingNoteIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (primaryEditingNoteIdRef.current === id) {
      primaryEditingNoteIdRef.current = null;
    }
    setRichTextToolbar((prev) => (prev?.sourceId === id ? null : prev));
  }

  function handleStartEdit(id: string) {
    setMode("select");
    canvasRef.current?.setDrawingMode(false);
    setEditingNoteIds(new Set([id]));
    primaryEditingNoteIdRef.current = id;
    bringToFront(id);
  }

  async function handleResize(id: string, width: number, height: number) {
    const prevNote = notesRef.current.find((n) => n.id === id);
    if (prevNote && (prevNote.width !== width || prevNote.height !== height)) {
      noteRedoStackRef.current = [];
      noteUndoStackRef.current.push({
        type: "size",
        noteId: id,
        prevWidth: prevNote.width ?? null,
        prevHeight: prevNote.height ?? null,
      });
    }
    lastResizedNoteRef.current = { id, at: Date.now() };
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, width, height } : n)),
    );
    try {
      await patchNote(id, { width, height });
    } catch {
      // Silently fail
    }
  }

  async function handleColorChange(id: string, color: string) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, color } : n)),
    );
    try {
      await patchNote(id, { color });
    } catch {
      // Silently fail
    }
  }

  async function handleRotationChange(id: string, rotation: number) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, rotation } : n)),
    );
    try {
      await patchNote(id, { rotation });
    } catch {
      // Silently fail
    }
  }

  async function handleDelete(id: string) {
    deletedNoteIdsRef.current.add(id);
    setTimeout(() => deletedNoteIdsRef.current.delete(id), 2000);
    const pending = noteDragMapRef.current.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      noteDragMapRef.current.delete(id);
    }
    const deletedNote = notesRef.current.find((n) => n.id === id);
    if (deletedNote) {
      noteRedoStackRef.current = [];
      noteUndoStackRef.current.push({ type: "delete", note: { ...deletedNote } });
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setEditingNoteIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      if (primaryEditingNoteIdRef.current === id) {
        primaryEditingNoteIdRef.current = next.size ? next.values().next().value ?? null : null;
      }
      return next;
    });
    try {
      await deleteNote(id);
    } catch {
      fetchData();
    }
  }

  const DUPLICATE_OFFSET = 20;

  async function handleDuplicateNote(note: NoteSummaryDto) {
    if (!boardId) return;
    setItemContextMenu(null);
    try {
      const created = await createNote({
        boardId,
        title: note.title ?? undefined,
        content: note.content ?? "",
        positionX: (note.positionX ?? 0) + DUPLICATE_OFFSET,
        positionY: (note.positionY ?? 0) + DUPLICATE_OFFSET,
        width: note.width ?? undefined,
        height: note.height ?? undefined,
        color: note.color ?? undefined,
        rotation: note.rotation ?? undefined,
      });
      setNotes((prev) => [created, ...prev]);
      bringToFront(created.id);
    } catch {
      // Silently fail
    }
  }

  function buildItemContextMenuItems(): import("../components/ui/ContextMenu").ContextMenuItem[] {
    if (!itemContextMenu) return [];
    const { note } = itemContextMenu;
    return [
      { label: "Edit", icon: Pencil, onClick: () => handleStartEdit(note.id) },
      { label: "Duplicate", icon: Copy, onClick: () => handleDuplicateNote(note) },
      { label: "Bring to front", icon: Layers, onClick: () => bringToFront(note.id) },
      { label: "Delete", icon: Trash2, onClick: () => handleDelete(note.id), divider: true },
    ];
  }

  // --- Render ---
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ backgroundColor: CHALKBOARD_BG }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/40 border-t-transparent" />
          <span className="text-sm text-white/60">Loading your chalkboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center" style={{ backgroundColor: CHALKBOARD_BG }}>
        <div className="text-center">
          <p className="mb-2 text-sm text-red-400">{error}</p>
          <button
            type="button"
            onClick={fetchData}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const cursorClass = isPanning ? "cursor-grabbing" : isSpaceHeld ? "cursor-grab" : "";
  const chalkBg =
    backgroundTheme === "whiteboard"
      ? CHALK_WHITEBOARD_BG
      : backgroundTheme === "blackboard"
        ? CHALK_BLACKBOARD_BG
        : CHALKBOARD_BG;

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Chalkboard frame - border color matches background theme */}
      <div
        className={[
          "chalkboard-frame relative flex-1 min-h-0 flex flex-col overflow-hidden rounded-t-none",
          backgroundTheme === "whiteboard" && "chalkboard-frame--whiteboard",
          backgroundTheme === "blackboard" && "chalkboard-frame--blackboard",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Menu card inside frame, overlapping chalkboard surface under top border */}
        <div className="pointer-events-none absolute left-0 right-0 top-2 z-30 flex items-start gap-2 px-2 sm:top-3 sm:px-3">
          {connectedUsers.length > 0 ? (
            <div className="invisible shrink-0 rounded-lg border border-border/60 bg-[linear-gradient(180deg,#fffef7_0%,#fffdf2_100%)] px-1.5 py-1 shadow-sm dark:border-border/40 dark:bg-[linear-gradient(180deg,hsl(222,22%,17%)_0%,hsl(222,22%,15%)_100%)] sm:px-2">
              <BoardConnectedUsers users={connectedUsers} />
            </div>
          ) : null}
          <div className="notepad-card pointer-events-auto min-w-0 flex-1 !overflow-visible rounded-lg border border-black/10 shadow-md dark:border-white/10">
            <div className="notepad-spiral-strip" />
            <div className="flex w-full min-w-0 items-center gap-2 px-2 py-1.5 sm:gap-3 sm:px-3 sm:py-2">
              <div className="min-w-0 w-full flex-1">
                <BoardMenuBar
                  boardType="ChalkBoard"
                  zoom={zoom}
                  onZoomChange={(z) => handleViewportChange(z, panX, panY)}
                  onSaveToFile={handleSaveToFile}
                  onLoadFromFile={handleLoadFromFile}
                  onUndo={triggerMenuUndo}
                  onRedo={triggerMenuRedo}
                  canUndo={mode === "draw" ? true : noteUndoStackRef.current.length > 0}
                  canRedo={mode === "draw" ? true : noteRedoStackRef.current.length > 0}
                  onInsertStickyNote={handleAddStickyNote}
                  backgroundTheme={backgroundTheme}
                  onBackgroundThemeChange={setBackgroundTheme}
                  autoEnlargeNotes={autoEnlargeNotes}
                  onAutoEnlargeNotesChange={setAutoEnlargeNotes}
                  richTextToolbar={richTextToolbar}
                  onNavigatePreviousNote={handleNavigatePreviousNote}
                  onNavigateNextNote={handleNavigateNextNote}
                  noteNavigationDisabled={notes.length === 0}
                  chalkTools={
                    <ChalkToolbar
                      embedded
                      mode={mode}
                      tool={tool}
                      brushColor={brushColor}
                      brushSize={brushSize}
                      onModeChange={handleModeChange}
                      onToolChange={handleToolChange}
                      onBrushColorChange={handleBrushColorChange}
                      onBrushSizeChange={handleBrushSizeChange}
                      onUndo={() => canvasRef.current?.undo()}
                      onRedo={() => canvasRef.current?.redo()}
                      onClear={() => canvasRef.current?.clear()}
                      onAddStickyNote={handleAddStickyNote}
                    />
                  }
                />
              </div>
            </div>
          </div>
          {connectedUsers.length > 0 ? (
            <div className="pointer-events-auto shrink-0 rounded-lg border border-border/60 bg-[linear-gradient(180deg,#fffef7_0%,#fffdf2_100%)] px-1.5 py-1 shadow-sm dark:border-border/40 dark:bg-[linear-gradient(180deg,hsl(222,22%,17%)_0%,hsl(222,22%,15%)_100%)] sm:px-2">
              <BoardConnectedUsers users={connectedUsers} />
            </div>
          ) : null}
        </div>
        <input
          ref={loadFileInputRef}
          type="file"
          accept=".json,.asidenote-board,application/json"
          className="hidden"
          aria-hidden
          onChange={handleLoadFileSelect}
        />
        {/* Viewport (clips and captures pan/zoom events) */}
        <div
          ref={viewportRef}
          className={[
            "chalkboard-surface relative flex-1 min-h-0 w-full overflow-hidden",
            isDragOver ? "ring-2 ring-inset ring-white/20" : "",
            cursorClass,
          ].join(" ")}
          style={{ backgroundColor: chalkBg }}
          onMouseLeave={handleChalkBoardMouseLeave}
          onMouseDown={handleViewportMouseDown}
          onMouseMove={handleChalkBoardMouseMove}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
        {/* Layer 1: Drawing canvas (uses fabric.js viewport transform for zoom/pan) */}
        <ChalkCanvas
          ref={canvasRef}
          isActive={mode === "draw" && !isSpaceHeld && !isPanning}
          brushColor={brushColor}
          brushSize={brushSize}
          zoom={zoom}
          panX={panX}
          panY={panY}
          onChange={handleCanvasChange}
          backgroundColor={chalkBg}
        />

        {/* Layer 2: Sticky notes (expandable canvas; uses CSS transform for zoom/pan, matches Fabric viewport) */}
        <div
          className="absolute origin-top-left"
          style={{
            transform: `translate(${-chalkNotesBounds.contentMinX}px, ${-chalkNotesBounds.contentMinY}px) scale(${zoom / RESOLUTION_FACTOR}) translate(${panX}px, ${panY}px)`,
            width: `${chalkNotesBounds.canvasWidth}px`,
            height: `${chalkNotesBounds.canvasHeight}px`,
            pointerEvents: mode === "select" && !isSpaceHeld && !isPanning ? "auto" : "none",
          }}
          onClick={(e) => {
            if (!(e.target as Element).closest("[data-board-item]")) {
              setEditingNoteIds(new Set());
              primaryEditingNoteIdRef.current = null;
            }
          }}
        >
          <div
            style={{
              transform: `translate(${-chalkNotesBounds.contentMinX}px, ${-chalkNotesBounds.contentMinY}px)`,
              width: "100%",
              height: "100%",
            }}
          >
            {/* Remote cursors (board-space coordinates) */}
            <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
              {Array.from(remoteCursors.entries()).map(([userId, { x, y, color }]) => (
                <div
                  key={userId}
                  className="absolute z-[9999] flex items-center gap-1 overflow-visible"
                  style={{ left: x, top: y, transform: "translate(-6px, -2px)" }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 32 32"
                    width="32"
                    height="32"
                    className="drop-shadow-lg"
                  >
                    <path d="M6 2v24l6-6 4 10 4-2-4-10h8L6 2z" fill={color} stroke="rgba(255,255,255,0.9)" strokeWidth="0.5" />
                  </svg>
                </div>
              ))}
            </div>
            {notes.map((note) => (
              <StickyNote
                key={note.id}
                note={note}
                isEditing={editingNoteIds.has(note.id)}
                enlargeWhenEditing={autoEnlargeNotes}
                focusedBy={remoteFocus.get(`note:${note.id}`) ?? null}
                zIndex={(zIndexMap[note.id] ?? 0) + (editingNoteIds.has(note.id) ? 10000 : 0)}
                onDrag={handleNoteDrag}
                onDragStart={handleNoteDragStart}
                onDragStop={handleDragStop}
                onDelete={handleDelete}
                onStartEdit={handleStartEdit}
                onSave={handleSave}
                onContentChange={handleNoteContentChange}
                onResize={handleResize}
                onColorChange={handleColorChange}
                onRotationChange={handleRotationChange}
                onBringToFront={bringToFront}
                onUnmount={handleNoteUnmount}
                onExitEdit={handleExitEditNote}
                onContextMenu={(e) => setItemContextMenu({ x: e.clientX, y: e.clientY, note })}
                zoom={zoom / RESOLUTION_FACTOR}
                onRichTextToolbarChange={handleRichTextToolbarChange}
              />
            ))}
          </div>
        </div>
        </div>

        {/* Zoom controls and toolbar - pointer-events-none so canvas receives clicks; only the controls themselves are interactive */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="absolute bottom-8 left-4 pointer-events-auto">
            <ZoomControls
              zoom={zoom}
              onZoomChange={zoomToCenter}
              onReset={handleZoomReset}
              onCenterView={handleCenterView}
            />
          </div>
        </div>

        {boardContextMenu && (
          <ContextMenu
            x={boardContextMenu.x}
            y={boardContextMenu.y}
            items={[
              { label: "Add Sticky Note", icon: StickyNoteIcon, onClick: handleAddStickyNote },
              {
                label: "Undo",
                onClick: triggerMenuUndo,
                disabled: mode === "draw" ? false : noteUndoStackRef.current.length === 0,
                divider: true,
              },
              {
                label: "Redo",
                onClick: triggerMenuRedo,
                disabled: mode === "draw" ? false : noteRedoStackRef.current.length === 0,
              },
            ]}
            onClose={() => setBoardContextMenu(null)}
          />
        )}

        {itemContextMenu && (
          <ContextMenu
            x={itemContextMenu.x}
            y={itemContextMenu.y}
            items={buildItemContextMenuItems()}
            onClose={() => setItemContextMenu(null)}
          />
        )}
      </div>
    </div>
  );
}
