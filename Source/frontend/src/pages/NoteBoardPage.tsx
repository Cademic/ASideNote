import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import type { AppLayoutContext } from "../components/layout/AppLayout";
import {
  BoardMenuBar,
  type BoardBackgroundTheme,
  type BoardRichTextToolbarState,
} from "../components/dashboard/BoardMenuBar";
import { BoardConnectedUsers } from "../components/dashboard/BoardConnectedUsers";
import { CorkBoard } from "../components/dashboard/CorkBoard";
import { StickyNote, STICKY_NOTE_DEFAULT_SIZE } from "../components/dashboard/StickyNote";
import { IndexCard } from "../components/dashboard/IndexCard";
import { ImageCard } from "../components/dashboard/ImageCard";
import { RedStringLayer } from "../components/dashboard/RedStringLayer";
import { getNotes, createNote, patchNote, deleteNote } from "../api/notes";
import {
  getIndexCards,
  createIndexCard,
  patchIndexCard,
  deleteIndexCard,
} from "../api/index-cards";
import {
  getConnections,
  createConnection,
  deleteConnection,
} from "../api/connections";
import {
  getBoardById,
  getBoardImageCards,
  createBoardImageCard,
  patchBoardImageCard,
  deleteBoardImageCard,
  uploadBoardImage,
} from "../api/boards";
import type {
  NoteSummaryDto,
  IndexCardSummaryDto,
  BoardConnectionDto,
  BoardSummaryDto,
  BoardImageSummaryDto,
} from "../types";
import { useBoardRealtime, type BoardItemUpdatePayload, type BoardPresenceUser } from "../hooks/useBoardRealtime";
import { useAuth } from "../context/AuthContext";
import { getColorForUserId } from "../lib/presenceColors";
import { resolveNoteColorKey, resolveCardColorKey } from "../lib/boardItemColors";
import {
  createBoardExportPayload,
  triggerBoardDownload,
  buildBoardExportFilename,
  parseBoardExportFile,
} from "../lib/boardExport";
import { ContextMenu } from "../components/ui/ContextMenu";
import { Pencil, Copy, Trash2, Layers, StickyNote as StickyNoteIcon, CreditCard, Image as ImageIcon } from "lucide-react";

let nextTempCardId = 1;

export function NoteBoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { setBoardName, openBoard, setBoardPresence, connectedUsers, setBoardHubConnected } =
    useOutletContext<AppLayoutContext>();
  const { isAuthenticated, user } = useAuth();
  const currentUserId = user?.userId ?? null;

  const [board, setBoard] = useState<BoardSummaryDto | null>(null);
  const boardNameRef = useRef<string>(board?.name ?? "");
  boardNameRef.current = board?.name ?? "";
  const [notes, setNotes] = useState<NoteSummaryDto[]>([]);
  const [indexCards, setIndexCards] = useState<IndexCardSummaryDto[]>([]);
  const [imageCards, setImageCards] = useState<BoardImageSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNoteIds, setEditingNoteIds] = useState<Set<string>>(new Set());
  const [editingCardIds, setEditingCardIds] = useState<Set<string>>(new Set());
  const [richTextToolbar, setRichTextToolbar] = useState<BoardRichTextToolbarState | null>(null);
  const primaryEditingNoteIdRef = useRef<string | null>(null);
  const primaryEditingCardIdRef = useRef<string | null>(null);
  const loadFileInputRef = useRef<HTMLInputElement>(null);

  // --- Board UI preferences (persist in localStorage) ---
  const [backgroundTheme, setBackgroundTheme] = useState<BoardBackgroundTheme>(() => {
    if (!boardId) return "default";
    try {
      const saved = localStorage.getItem(`board-theme-${boardId}`);
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

  // --- Z-index stacking order ---
  const [zIndexMap, setZIndexMap] = useState<Record<string, number>>({});
  const zCounterRef = useRef(1);

  // --- Board undo/redo stacks (notes, connections, images, index cards) ---
  type BoardUndoEntry =
    | { type: "note-position"; noteId: string; prevPositionX: number; prevPositionY: number }
    | { type: "note-size"; noteId: string; prevWidth: number | null; prevHeight: number | null }
    | { type: "note-delete"; note: NoteSummaryDto; removedConnections: BoardConnectionDto[] }
    | { type: "connection-create"; connection: BoardConnectionDto }
    | { type: "connection-delete"; connection: BoardConnectionDto }
    | { type: "image-add"; image: BoardImageSummaryDto }
    | { type: "image-delete"; image: BoardImageSummaryDto }
    | { type: "image-position"; cardId: string; prevPositionX: number; prevPositionY: number }
    | { type: "image-size"; cardId: string; prevWidth: number | null; prevHeight: number | null; prevPositionX?: number; prevPositionY?: number }
    | { type: "card-position"; cardId: string; prevPositionX: number; prevPositionY: number }
    | { type: "card-size"; cardId: string; prevWidth: number | null; prevHeight: number | null }
    | { type: "card-delete"; card: IndexCardSummaryDto }
    | { type: "card-create"; card: IndexCardSummaryDto }
    | { type: "note-create"; note: NoteSummaryDto };
  type BoardRedoEntry =
    | { type: "note-position"; noteId: string; positionX: number; positionY: number }
    | { type: "note-size"; noteId: string; width: number; height: number }
    | { type: "note-delete"; noteId: string }
    | { type: "connection-create"; connectionId: string }
    | { type: "connection-delete"; fromItemId: string; toItemId: string }
    | { type: "image-add"; imageId: string }
    | { type: "image-delete"; image: BoardImageSummaryDto }
    | { type: "image-position"; cardId: string; positionX: number; positionY: number }
    | { type: "image-size"; cardId: string; width: number; height: number; positionX?: number; positionY?: number }
    | { type: "card-position"; cardId: string; positionX: number; positionY: number }
    | { type: "card-size"; cardId: string; width: number; height: number }
    | { type: "card-delete"; cardId: string }
    | { type: "card-create"; card: IndexCardSummaryDto }
    | { type: "note-create"; note: NoteSummaryDto };
  const boardUndoStackRef = useRef<BoardUndoEntry[]>([]);
  const boardRedoStackRef = useRef<BoardRedoEntry[]>([]);
  const notesRef = useRef(notes);
  const indexCardsRef = useRef(indexCards);
  const imageCardsRef = useRef(imageCards);
  notesRef.current = notes;
  indexCardsRef.current = indexCards;
  imageCardsRef.current = imageCards;

  function bringToFront(id: string) {
    const next = zCounterRef.current++;
    setZIndexMap((prev) => ({ ...prev, [id]: next }));
  }

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

  // --- Red-string linking state ---
  const [connections, setConnections] = useState<BoardConnectionDto[]>([]);
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const [linkMousePos, setLinkMousePos] = useState<{ x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  /** Same element as RedStringLayer’s SVG — use for linking cursor coords (must match SVG viewport, not outer canvas). */
  const redStringSvgRef = useRef<SVGSVGElement>(null);
  const boardViewportRef = useRef<HTMLDivElement>(null);

  // Fixed-size canvas that expands when content is placed or dragged outside current bounds.
  const CANVAS_PADDING = 300;
  const DEFAULT_CANVAS_SIZE = 2000;
  const INDEX_CARD_DEFAULT_W = 450;
  const INDEX_CARD_DEFAULT_H = 300;
  const IMAGE_CARD_DEFAULT_W = 200;
  const IMAGE_CARD_DEFAULT_H = 150;
  const POSITION_DEFAULT = 20;

  const canvasBounds = useMemo(() => {
    let minX = 0;
    let minY = 0;
    let maxX = DEFAULT_CANVAS_SIZE;
    let maxY = DEFAULT_CANVAS_SIZE;
    const update = (x: number, y: number, w: number, h: number) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    };
    for (const n of notes) {
      const x = n.positionX ?? POSITION_DEFAULT;
      const y = n.positionY ?? POSITION_DEFAULT;
      const w = n.width ?? STICKY_NOTE_DEFAULT_SIZE;
      const h = n.height ?? STICKY_NOTE_DEFAULT_SIZE;
      update(x, y, w, h);
    }
    for (const c of indexCards) {
      const x = c.positionX ?? POSITION_DEFAULT;
      const y = c.positionY ?? POSITION_DEFAULT;
      const w = c.width ?? INDEX_CARD_DEFAULT_W;
      const h = c.height ?? INDEX_CARD_DEFAULT_H;
      update(x, y, w, h);
    }
    for (const img of imageCards) {
      const x = img.positionX ?? POSITION_DEFAULT;
      const y = img.positionY ?? POSITION_DEFAULT;
      const w = img.width ?? IMAGE_CARD_DEFAULT_W;
      const h = img.height ?? IMAGE_CARD_DEFAULT_H;
      update(x, y, w, h);
    }
    const contentMinX = minX - CANVAS_PADDING;
    const contentMinY = minY - CANVAS_PADDING;
    const canvasWidth = maxX - contentMinX + CANVAS_PADDING;
    const canvasHeight = maxY - contentMinY + CANVAS_PADDING;
    return { contentMinX, contentMinY, canvasWidth, canvasHeight };
  }, [notes, indexCards, imageCards]);

  const linkingFromRef = useRef<string | null>(null);
  const connectionsRef = useRef(connections);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const imageIdsRef = useRef<Set<string>>(new Set());
  const deletedImageIdsRef = useRef<Set<string>>(new Set());
  const deletedNoteIdsRef = useRef<Set<string>>(new Set());
  const deletedCardIdsRef = useRef<Set<string>>(new Set());
  /** Last note id jumped to via View → Previous/Next note (for cycling order). */
  const noteNavAnchorRef = useRef<string | null>(null);
  const [pendingImageDrop, setPendingImageDrop] = useState<{ x: number; y: number } | null>(null);

  // --- Viewport state (pan & zoom) ---
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isBoardHovered, setIsBoardHovered] = useState(false);
  const scrollSliderXRef = useRef(0);
  const scrollSliderYRef = useRef(0);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  zoomRef.current = zoom;
  panXRef.current = panX;
  panYRef.current = panY;

  // When canvas bounds (contentMin) change (e.g. after moving a note), adjust pan so the view doesn't jump
  const prevContentMinRef = useRef<{ contentMinX: number; contentMinY: number } | null>(null);
  useEffect(() => {
    const prev = prevContentMinRef.current;
    if (prev === null) {
      prevContentMinRef.current = {
        contentMinX: canvasBounds.contentMinX,
        contentMinY: canvasBounds.contentMinY,
      };
      return;
    }
    const dx = canvasBounds.contentMinX - prev.contentMinX;
    const dy = canvasBounds.contentMinY - prev.contentMinY;
    prevContentMinRef.current = {
      contentMinX: canvasBounds.contentMinX,
      contentMinY: canvasBounds.contentMinY,
    };
    if (dx === 0 && dy === 0) return;
    setPanX((p) => p + (dx * (zoom + 1)) / zoom);
    setPanY((p) => p + (dy * (zoom + 1)) / zoom);
  }, [canvasBounds.contentMinX, canvasBounds.contentMinY, zoom]);

  // --- Context menu state ---
  const [boardContextMenu, setBoardContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [itemContextMenu, setItemContextMenu] = useState<
    | { x: number; y: number; type: "note"; note: NoteSummaryDto }
    | { x: number; y: number; type: "card"; card: IndexCardSummaryDto }
    | { x: number; y: number; type: "image"; image: BoardImageSummaryDto }
    | null
  >(null);

  // --- Board presence: who is focusing which item, remote cursors ---
  const [remoteFocus, setRemoteFocus] = useState<Map<string, { userId: string; color: string }[]>>(new Map());
  const [remoteCursors, setRemoteCursors] = useState<Map<string, { x: number; y: number; color: string }>>(new Map());
  const [remoteTextCursors, setRemoteTextCursors] = useState<Map<string, { itemType: string; itemId: string; field: "title" | "content"; position: number; color: string }>>(new Map());
  const cursorThrottleRef = useRef<{ last: number }>({ last: 0 });
  const CURSOR_THROTTLE_MS = 60;

  // Restore viewport from localStorage on mount; reset bounds ref so pan compensation seeds for this board
  useEffect(() => {
    if (!boardId) return;
    prevContentMinRef.current = null;
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

  // Sync backgroundTheme and autoEnlargeNotes from localStorage when boardId changes
  useEffect(() => {
    if (!boardId) return;
    try {
      const theme = localStorage.getItem(`board-theme-${boardId}`);
      if (theme === "whiteboard" || theme === "blackboard" || theme === "default") {
        setBackgroundTheme(theme);
      }
      setAutoEnlargeNotes(localStorage.getItem(`board-auto-enlarge-${boardId}`) !== "0");
    } catch {
      // ignore
    }
  }, [boardId]);

  // Persist backgroundTheme and autoEnlargeNotes when changed
  useEffect(() => {
    if (!boardId) return;
    try {
      localStorage.setItem(`board-theme-${boardId}`, backgroundTheme);
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

  // Keep refs in sync so document listeners can read latest value
  linkingFromRef.current = linkingFrom;
  connectionsRef.current = connections;

  // Close edit mode when clicking anywhere except the editing note/card
  useEffect(() => {
    function handleDocumentMouseDown(e: MouseEvent) {
      const primaryNote = primaryEditingNoteIdRef.current;
      const primaryCard = primaryEditingCardIdRef.current;
      if (!primaryNote && !primaryCard) return;

      const target = e.target as Element;
      if (target.closest("[data-board-toolbar-portal]")) return;
      if (target.closest("[data-board-menu-bar]")) return;

      const noteEl = target.closest("[data-board-item='note'][data-note-id]");
      const cardEl = target.closest("[data-board-item='card'][data-card-id]");

      if (primaryNote && noteEl?.getAttribute("data-note-id") === primaryNote) return;
      if (primaryCard && cardEl?.getAttribute("data-card-id") === primaryCard) return;

      setEditingNoteIds(new Set());
      setEditingCardIds(new Set());
      primaryEditingNoteIdRef.current = null;
      primaryEditingCardIdRef.current = null;
      setRichTextToolbar(null);
    }
    document.addEventListener("mousedown", handleDocumentMouseDown, true);
    return () => document.removeEventListener("mousedown", handleDocumentMouseDown, true);
  }, []);

  const fetchData = useCallback(async () => {
    if (!boardId) return;
    try {
      setError(null);
      const [boardRes, notesRes, cardsRes, connsRes, imagesRes] = await Promise.allSettled([
        getBoardById(boardId),
        getNotes({ boardId, limit: 100 }),
        getIndexCards({ boardId, limit: 100 }),
        getConnections({ boardId }),
        getBoardImageCards(boardId),
      ]);

      if (boardRes.status === "fulfilled") {
        setBoard(boardRes.value);
      }
      if (notesRes.status === "fulfilled") {
        const newNoteIds = notesRes.value.items.map((n) => n.id);
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
        }
        setNotes(notesRes.value.items);
      }
      if (cardsRes.status === "fulfilled") {
        setIndexCards(cardsRes.value.items);
      }
      if (connsRes.status === "fulfilled") {
        setConnections(connsRes.value);
      }
      if (imagesRes.status === "fulfilled") {
        const deleted = deletedImageIdsRef.current;
        setImageCards(imagesRes.value.filter((img) => !deleted.has(img.id)));
      }

      // Only show error if all failed
      if (
        boardRes.status === "rejected" &&
        notesRes.status === "rejected" &&
        cardsRes.status === "rejected" &&
        imagesRes.status === "rejected"
      ) {
        setError("Failed to load board items.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [fetchData, isAuthenticated]);

  const draggingNoteIdRef = useRef<string | null>(null);
  const draggingCardIdRef = useRef<string | null>(null);
  const draggingImageIdRef = useRef<string | null>(null);
  const RESIZE_ECHO_IGNORE_MS = 400;
  const lastResizedImageRef = useRef<{ id: string; at: number } | null>(null);
  const lastResizedNoteRef = useRef<{ id: string; at: number } | null>(null);
  const lastResizedCardRef = useRef<{ id: string; at: number } | null>(null);

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
  const mergeCardPayload = useCallback((payload: BoardItemUpdatePayload) => {
    const id = String(payload.id);
    const skipPosition = id === draggingCardIdRef.current;
    const skipSize =
      lastResizedCardRef.current?.id === id &&
      Date.now() - lastResizedCardRef.current.at < RESIZE_ECHO_IGNORE_MS;
    setIndexCards((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const next = { ...c };
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

  const handleUserFocusingItem = useCallback(
    (userId: string, itemType: string, itemId: string | null) => {
      if (currentUserId != null && userId === currentUserId) return;
      setRemoteFocus((prev) => {
        const next = new Map(prev);
        const color = getColorForUserId(userId);
        const entry = { userId, color };
        for (const [key, list] of next) {
          const filtered = list.filter((u) => u.userId !== userId);
          if (filtered.length === 0) next.delete(key);
          else next.set(key, filtered);
        }
        if (itemId) {
          const key = `${itemType}:${itemId}`;
          const existing = next.get(key) ?? [];
          if (!existing.some((u) => u.userId === userId)) next.set(key, [...existing, entry]);
        }
        return next;
      });
    },
    [currentUserId],
  );
  const handleCursorPosition = useCallback((userId: string, x: number, y: number) => {
    if (x < 0 || y < 0) {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
      return;
    }
    setRemoteCursors((prev) => {
      const next = new Map(prev);
      next.set(userId, { x, y, color: getColorForUserId(userId) });
      return next;
    });
  }, []);

  const handleTextCursorPosition = useCallback((userId: string, itemType: string, itemId: string, field: "title" | "content", position: number) => {
    if (currentUserId != null && userId === currentUserId) return;
    setRemoteTextCursors((prev) => {
      const next = new Map(prev);
      if (position < 0) {
        next.delete(userId);
      } else {
        next.set(userId, { itemType, itemId, field, position, color: getColorForUserId(userId) });
      }
      return next;
    });
  }, [currentUserId]);

  const handleUserLeft = useCallback((userId: string) => {
    setRemoteTextCursors((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
    setRemoteCursors((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  }, []);

  const handlePresenceUpdate = useCallback((users: BoardPresenceUser[]) => {
    setBoardPresence(users);
    const presentIds = new Set(users.map((u) => u.userId));
    setRemoteTextCursors((prev) => {
      const toRemove = [...prev.keys()].filter((uid) => !presentIds.has(uid));
      if (toRemove.length === 0) return prev;
      const next = new Map(prev);
      for (const uid of toRemove) next.delete(uid);
      return next;
    });
    setRemoteCursors((prev) => {
      const toRemove = [...prev.keys()].filter((uid) => !presentIds.has(uid));
      if (toRemove.length === 0) return prev;
      const next = new Map(prev);
      for (const uid of toRemove) next.delete(uid);
      return next;
    });
  }, []);

  useEffect(() => {
    imageIdsRef.current = new Set(imageCards.map((img) => img.id));
  }, [imageCards]);

  const handleImageCardAdded = useCallback((payload: { id: string; imageUrl?: string; positionX?: number; positionY?: number; width?: number | null; height?: number | null; rotation?: number | null }) => {
    if (deletedImageIdsRef.current.has(payload.id)) return;
    setImageCards((prev) => {
      if (prev.some((img) => img.id === payload.id)) return prev;
      const img: BoardImageSummaryDto = {
        id: payload.id,
        imageUrl: payload.imageUrl ?? "",
        positionX: payload.positionX ?? 20,
        positionY: payload.positionY ?? 20,
        width: payload.width ?? null,
        height: payload.height ?? null,
        rotation: payload.rotation ?? null,
      };
      return [...prev, img];
    });
  }, []);

  const mergeImageCardPayload = useCallback((payload: { id: string; imageUrl?: string; positionX?: number; positionY?: number; width?: number | null; height?: number | null; rotation?: number | null }) => {
    const id = String(payload.id);
    const skipPosition = id === draggingImageIdRef.current;
    const skipSize =
      lastResizedImageRef.current?.id === id &&
      Date.now() - lastResizedImageRef.current.at < RESIZE_ECHO_IGNORE_MS;
    setImageCards((prev) =>
      prev.map((img) => {
        if (img.id !== id) return img;
        const next = { ...img };
        if (payload.imageUrl !== undefined) next.imageUrl = payload.imageUrl;
        if (!skipPosition && payload.positionX !== undefined) next.positionX = payload.positionX;
        if (!skipPosition && payload.positionY !== undefined) next.positionY = payload.positionY;
        if (!skipSize && payload.width !== undefined) next.width = payload.width;
        if (!skipSize && payload.height !== undefined) next.height = payload.height;
        if (payload.rotation !== undefined) next.rotation = payload.rotation;
        return next;
      }),
    );
  }, []);

  const handleImageCardDeleted = useCallback((imageId: string) => {
    deletedImageIdsRef.current.add(imageId);
    setImageCards((prev) => prev.filter((img) => img.id !== imageId));
    setConnections((prev) => prev.filter((c) => c.fromItemId !== imageId && c.toItemId !== imageId));
  }, []);

  const handleNoteDeleted = useCallback((noteId: string) => {
    deletedNoteIdsRef.current.add(noteId);
    setTimeout(() => deletedNoteIdsRef.current.delete(noteId), 2000);
    const pending = noteDragMapRef.current.get(noteId);
    if (pending) {
      clearTimeout(pending.timer);
      noteDragMapRef.current.delete(noteId);
    }
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setEditingNoteIds((prev) => {
      if (!prev.has(noteId)) return prev;
      const next = new Set(prev);
      next.delete(noteId);
      if (primaryEditingNoteIdRef.current === noteId) primaryEditingNoteIdRef.current = null;
      return next;
    });
    setConnections((prev) => prev.filter((c) => c.fromItemId !== noteId && c.toItemId !== noteId));
  }, []);
  const handleIndexCardDeleted = useCallback((cardId: string) => {
    deletedCardIdsRef.current.add(cardId);
    setTimeout(() => deletedCardIdsRef.current.delete(cardId), 2000);
    const pending = cardDragMapRef.current.get(cardId);
    if (pending) {
      clearTimeout(pending.timer);
      cardDragMapRef.current.delete(cardId);
    }
    setIndexCards((prev) => prev.filter((c) => c.id !== cardId));
    setEditingCardIds((prev) => {
      if (!prev.has(cardId)) return prev;
      const next = new Set(prev);
      next.delete(cardId);
      if (primaryEditingCardIdRef.current === cardId) primaryEditingCardIdRef.current = null;
      return next;
    });
    setConnections((prev) => prev.filter((c) => c.fromItemId !== cardId && c.toItemId !== cardId));
  }, []);

  const { sendFocus, sendCursor, sendTextCursor, isHubConnected } = useBoardRealtime(boardId ?? undefined, fetchData, {
    enabled: !!board?.projectId,
    onNoteUpdated: mergeNotePayload,
    onIndexCardUpdated: mergeCardPayload,
    onPresenceUpdate: handlePresenceUpdate,
    onUserFocusingItem: handleUserFocusingItem,
    onCursorPosition: handleCursorPosition,
    onTextCursorPosition: handleTextCursorPosition,
    onUserLeft: handleUserLeft,
    onNoteDeleted: handleNoteDeleted,
    onIndexCardDeleted: handleIndexCardDeleted,
    onImageCardDeleted: handleImageCardDeleted,
    onImageCardAdded: handleImageCardAdded,
    onImageCardUpdated: mergeImageCardPayload,
  });

  useEffect(() => {
    setBoardHubConnected(isHubConnected);
    return () => setBoardHubConnected(false);
  }, [isHubConnected, setBoardHubConnected]);

  useEffect(() => {
    const primaryNote = primaryEditingNoteIdRef.current;
    const primaryCard = primaryEditingCardIdRef.current;
    if (primaryNote) sendFocus("note", primaryNote);
    else if (primaryCard) sendFocus("card", primaryCard);
    else sendFocus("note", null);
  }, [editingNoteIds, editingCardIds, sendFocus]);

  const handleBoardMouseMove = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      if (now - cursorThrottleRef.current.last < CURSOR_THROTTLE_MS) return;
      cursorThrottleRef.current.last = now;
      sendCursor(x, y);
    },
    [sendCursor],
  );
  const handleBoardMouseLeave = useCallback(() => {
    sendCursor(-1, -1);
  }, [sendCursor]);

  const DRAG_THROTTLE_MS = 120;
  type DragPending = { x: number; y: number; timer: ReturnType<typeof setTimeout> };
  const noteDragMapRef = useRef<Map<string, DragPending>>(new Map());
  const cardDragMapRef = useRef<Map<string, DragPending>>(new Map());

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
  const handleCardDrag = useCallback((id: string, x: number, y: number) => {
    const map = cardDragMapRef.current;
    let entry = map.get(id);
    if (!entry) {
      entry = {
        x,
        y,
        timer: setTimeout(() => {
          const e = map.get(id);
          if (e && !deletedCardIdsRef.current.has(id) && indexCardsRef.current.some((c) => c.id === id)) {
            patchIndexCard(id, { positionX: e.x, positionY: e.y }).catch(() => {});
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

  // Push the board name up to the navbar
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

  // Listen for sidebar tool clicks (custom event from Sidebar component)
  useEffect(() => {
    function onToolClick(e: Event) {
      const type = (e as CustomEvent).detail?.type as string | undefined;
      if (type === "sticky-note") {
        handleQuickAddNote();
      } else if (type === "index-card") {
        handleQuickAddCard();
      } else if (type === "image-card") {
        setPendingImageDrop(null);
        imageFileInputRef.current?.click();
      }
    }
    document.addEventListener("board-tool-click", onToolClick);
    return () => document.removeEventListener("board-tool-click", onToolClick);
  });

  // Ctrl+Z undo / Ctrl+Y redo for note position, size, and deletion (skip when typing in editor)
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

      if (isUndo) {
        const stack = boardUndoStackRef.current;
        if (stack.length === 0) return;
        e.preventDefault();
        const entry = stack.pop()!;
        if (entry.type === "note-position") {
          const current = notesRef.current.find((n) => n.id === entry.noteId);
          if (current) {
            boardRedoStackRef.current.push({
              type: "note-position",
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
        } else if (entry.type === "note-size") {
          const current = notesRef.current.find((n) => n.id === entry.noteId);
          if (current) {
            boardRedoStackRef.current.push({
              type: "note-size",
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
        } else if (entry.type === "note-delete") {
          const displayColorKey = resolveNoteColorKey(entry.note);
          const oldNoteId = entry.note.id;
          const removedConnections = entry.removedConnections ?? [];
          createNote({
            content: entry.note.content,
            boardId: boardId ?? undefined,
            title: entry.note.title ?? undefined,
            positionX: entry.note.positionX ?? 20,
            positionY: entry.note.positionY ?? 20,
            width: entry.note.width ?? undefined,
            height: entry.note.height ?? undefined,
            color: displayColorKey,
            rotation: entry.note.rotation ?? undefined,
          })
            .then(async (created) => {
              boardRedoStackRef.current.push({ type: "note-delete", noteId: created.id });
              const restored = { ...created, color: displayColorKey, rotation: entry.note.rotation ?? created.rotation };
              setNotes((prev) => (prev.some((n) => n.id === created.id) ? prev : [...prev, restored]));
              if (removedConnections.length === 0 || !boardId) return;
              try {
                const newConns = await Promise.all(
                  removedConnections.map((conn) =>
                    createConnection({
                      fromItemId: conn.fromItemId === oldNoteId ? created.id : conn.fromItemId,
                      toItemId: conn.toItemId === oldNoteId ? created.id : conn.toItemId,
                      boardId,
                    }),
                  ),
                );
                setConnections((prev) => {
                  let next = prev;
                  for (const nc of newConns) {
                    if (!next.some((c) => c.id === nc.id)) next = [...next, nc];
                  }
                  return next;
                });
              } catch {
                // connections best-effort
              }
            })
            .catch(() => {});
        } else if (entry.type === "note-create") {
          boardRedoStackRef.current.push({ type: "note-create", note: { ...entry.note } });
          deletedNoteIdsRef.current.add(entry.note.id);
          setTimeout(() => deletedNoteIdsRef.current.delete(entry.note.id), 2000);
          setNotes((prev) => prev.filter((n) => n.id !== entry.note.id));
          setEditingNoteIds((prev) => {
            const next = new Set(prev);
            next.delete(entry.note.id);
            if (primaryEditingNoteIdRef.current === entry.note.id) {
              primaryEditingNoteIdRef.current = next.size ? next.values().next().value ?? null : null;
            }
            return next;
          });
          setRichTextToolbar((prev) => (prev?.sourceId === entry.note.id ? null : prev));
          setConnections((prev) =>
            prev.filter((c) => c.fromItemId !== entry.note.id && c.toItemId !== entry.note.id),
          );
          deleteNote(entry.note.id).catch(() => fetchData());
        } else if (entry.type === "connection-create") {
          boardRedoStackRef.current.push({
            type: "connection-delete",
            fromItemId: entry.connection.fromItemId,
            toItemId: entry.connection.toItemId,
          });
          setConnections((prev) => prev.filter((c) => c.id !== entry.connection.id));
          deleteConnection(entry.connection.id).catch(() => {});
        } else if (entry.type === "connection-delete") {
          createConnection({
            fromItemId: entry.connection.fromItemId,
            toItemId: entry.connection.toItemId,
            boardId: boardId ?? undefined,
          })
            .then((created) => {
              boardRedoStackRef.current.push({ type: "connection-create", connectionId: created.id });
              setConnections((prev) => [...prev, created]);
            })
            .catch(() => {});
        } else if (entry.type === "image-add") {
          boardRedoStackRef.current.push({ type: "image-delete", image: { ...entry.image } });
          deletedImageIdsRef.current.add(entry.image.id);
          setImageCards((prev) => prev.filter((img) => img.id !== entry.image.id));
          setConnections((prev) =>
            prev.filter((c) => c.fromItemId !== entry.image.id && c.toItemId !== entry.image.id),
          );
          if (boardId) deleteBoardImageCard(boardId, entry.image.id).catch(() => fetchData());
        } else if (entry.type === "image-delete") {
          deletedImageIdsRef.current.delete(entry.image.id);
          createBoardImageCard(boardId!, {
            imageUrl: entry.image.imageUrl,
            positionX: entry.image.positionX,
            positionY: entry.image.positionY,
            width: entry.image.width ?? undefined,
            height: entry.image.height ?? undefined,
            rotation: entry.image.rotation ?? undefined,
          })
            .then((created) => {
              boardRedoStackRef.current.push({ type: "image-add", imageId: created.id });
              setImageCards((prev) => (prev.some((i) => i.id === created.id) ? prev : [...prev, created]));
            })
            .catch(() => {});
        } else if (entry.type === "image-position") {
          const current = imageCardsRef.current.find((img) => img.id === entry.cardId);
          if (current) {
            boardRedoStackRef.current.push({
              type: "image-position",
              cardId: entry.cardId,
              positionX: current.positionX,
              positionY: current.positionY,
            });
          }
          setImageCards((prev) =>
            prev.map((img) =>
              img.id === entry.cardId
                ? { ...img, positionX: entry.prevPositionX, positionY: entry.prevPositionY }
                : img,
            ),
          );
          if (boardId) patchBoardImageCard(boardId, entry.cardId, { positionX: entry.prevPositionX, positionY: entry.prevPositionY }).catch(() => {});
        } else if (entry.type === "image-size") {
          const current = imageCardsRef.current.find((img) => img.id === entry.cardId);
          if (current) {
            boardRedoStackRef.current.push({
              type: "image-size",
              cardId: entry.cardId,
              width: current.width ?? 0,
              height: current.height ?? 0,
              positionX: entry.prevPositionX,
              positionY: entry.prevPositionY,
            });
          }
          const w = entry.prevWidth ?? 100;
          const h = entry.prevHeight ?? 100;
          const payload: { width: number; height: number; positionX?: number; positionY?: number } = { width: w, height: h };
          if (entry.prevPositionX != null) payload.positionX = entry.prevPositionX;
          if (entry.prevPositionY != null) payload.positionY = entry.prevPositionY;
          setImageCards((prev) =>
            prev.map((img) =>
              img.id === entry.cardId
                ? { ...img, width: w, height: h, ...(entry.prevPositionX != null && { positionX: entry.prevPositionX }), ...(entry.prevPositionY != null && { positionY: entry.prevPositionY }) }
                : img,
            ),
          );
          if (boardId) patchBoardImageCard(boardId, entry.cardId, payload).catch(() => {});
        } else if (entry.type === "card-position") {
          const current = indexCardsRef.current.find((c) => c.id === entry.cardId);
          if (current) {
            boardRedoStackRef.current.push({
              type: "card-position",
              cardId: entry.cardId,
              positionX: current.positionX ?? 0,
              positionY: current.positionY ?? 0,
            });
          }
          setIndexCards((prev) =>
            prev.map((c) =>
              c.id === entry.cardId
                ? { ...c, positionX: entry.prevPositionX, positionY: entry.prevPositionY }
                : c,
            ),
          );
          patchIndexCard(entry.cardId, { positionX: entry.prevPositionX, positionY: entry.prevPositionY }).catch(() => {});
        } else if (entry.type === "card-size") {
          const current = indexCardsRef.current.find((c) => c.id === entry.cardId);
          if (current) {
            boardRedoStackRef.current.push({
              type: "card-size",
              cardId: entry.cardId,
              width: current.width ?? 450,
              height: current.height ?? 300,
            });
          }
          const w = entry.prevWidth ?? 450;
          const h = entry.prevHeight ?? 300;
          setIndexCards((prev) =>
            prev.map((c) =>
              c.id === entry.cardId ? { ...c, width: w, height: h } : c,
            ),
          );
          patchIndexCard(entry.cardId, { width: w, height: h }).catch(() => {});
        } else if (entry.type === "card-delete") {
          const displayColorKey = resolveCardColorKey(entry.card);
          createIndexCard({
            content: entry.card.content,
            boardId: boardId ?? undefined,
            title: entry.card.title ?? undefined,
            positionX: entry.card.positionX ?? 20,
            positionY: entry.card.positionY ?? 20,
            width: entry.card.width ?? undefined,
            height: entry.card.height ?? undefined,
            color: displayColorKey,
            rotation: entry.card.rotation ?? undefined,
          })
            .then((created) => {
              boardRedoStackRef.current.push({ type: "card-delete", cardId: created.id });
              const restored = { ...created, color: displayColorKey, rotation: entry.card.rotation ?? created.rotation };
              setIndexCards((prev) => (prev.some((c) => c.id === created.id) ? prev : [...prev, restored]));
            })
            .catch(() => {});
        } else if (entry.type === "card-create") {
          boardRedoStackRef.current.push({ type: "card-create", card: { ...entry.card } });
          setIndexCards((prev) => prev.filter((c) => c.id !== entry.card.id));
          setEditingCardIds((prev) => {
            const next = new Set(prev);
            next.delete(entry.card.id);
            if (primaryEditingCardIdRef.current === entry.card.id) {
              primaryEditingCardIdRef.current = next.size ? next.values().next().value ?? null : null;
            }
            return next;
          });
          setConnections((prev) =>
            prev.filter((c) => c.fromItemId !== entry.card.id && c.toItemId !== entry.card.id),
          );
          deleteIndexCard(entry.card.id).catch(() => fetchData());
        }
      } else {
        const stack = boardRedoStackRef.current;
        if (stack.length === 0) return;
        e.preventDefault();
        const entry = stack.pop()!;
        if (entry.type === "note-position") {
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
        } else if (entry.type === "note-size") {
          setNotes((prev) =>
            prev.map((n) =>
              n.id === entry.noteId ? { ...n, width: entry.width, height: entry.height } : n,
            ),
          );
          patchNote(entry.noteId, { width: entry.width, height: entry.height }).catch(() => {});
        } else if (entry.type === "note-delete") {
          deletedNoteIdsRef.current.add(entry.noteId);
          setTimeout(() => deletedNoteIdsRef.current.delete(entry.noteId), 2000);
          setNotes((prev) => prev.filter((n) => n.id !== entry.noteId));
          setEditingNoteIds((prev) => {
            const next = new Set(prev);
            next.delete(entry.noteId);
            if (primaryEditingNoteIdRef.current === entry.noteId) {
              primaryEditingNoteIdRef.current = next.size ? next.values().next().value ?? null : null;
            }
            return next;
          });
          setConnections((prev) =>
            prev.filter((c) => c.fromItemId !== entry.noteId && c.toItemId !== entry.noteId),
          );
          deleteNote(entry.noteId).catch(() => fetchData());
        } else if (entry.type === "connection-create") {
          deleteConnection(entry.connectionId).catch(() => {});
          setConnections((prev) => prev.filter((c) => c.id !== entry.connectionId));
        } else if (entry.type === "connection-delete") {
          createConnection({
            fromItemId: entry.fromItemId,
            toItemId: entry.toItemId,
            boardId: boardId ?? undefined,
          })
            .then((created) =>
              setConnections((prev) => (prev.some((c) => c.id === created.id) ? prev : [...prev, created])),
            )
            .catch(() => {});
        } else if (entry.type === "image-add") {
          const img = imageCardsRef.current.find((i) => i.id === entry.imageId);
          if (img) {
            deletedImageIdsRef.current.add(entry.imageId);
            setImageCards((prev) => prev.filter((i) => i.id !== entry.imageId));
            setConnections((prev) =>
              prev.filter((c) => c.fromItemId !== entry.imageId && c.toItemId !== entry.imageId),
            );
            if (boardId) deleteBoardImageCard(boardId, entry.imageId).catch(() => fetchData());
          }
        } else if (entry.type === "image-delete") {
          deletedImageIdsRef.current.delete(entry.image.id);
          createBoardImageCard(boardId!, {
            imageUrl: entry.image.imageUrl,
            positionX: entry.image.positionX,
            positionY: entry.image.positionY,
            width: entry.image.width ?? undefined,
            height: entry.image.height ?? undefined,
            rotation: entry.image.rotation ?? undefined,
          })
            .then((created) =>
              setImageCards((prev) => (prev.some((i) => i.id === created.id) ? prev : [...prev, created])),
            )
            .catch(() => {});
        } else if (entry.type === "image-position") {
          setImageCards((prev) =>
            prev.map((img) =>
              img.id === entry.cardId
                ? { ...img, positionX: entry.positionX, positionY: entry.positionY }
                : img,
            ),
          );
          if (boardId) patchBoardImageCard(boardId, entry.cardId, { positionX: entry.positionX, positionY: entry.positionY }).catch(() => {});
        } else if (entry.type === "image-size") {
          setImageCards((prev) =>
            prev.map((img) =>
              img.id === entry.cardId
                ? { ...img, width: entry.width, height: entry.height, ...(entry.positionX != null && { positionX: entry.positionX }), ...(entry.positionY != null && { positionY: entry.positionY }) }
                : img,
            ),
          );
          const payload: { width: number; height: number; positionX?: number; positionY?: number } = { width: entry.width, height: entry.height };
          if (entry.positionX != null) payload.positionX = entry.positionX;
          if (entry.positionY != null) payload.positionY = entry.positionY;
          if (boardId) patchBoardImageCard(boardId, entry.cardId, payload).catch(() => {});
        } else if (entry.type === "card-position") {
          setIndexCards((prev) =>
            prev.map((c) =>
              c.id === entry.cardId
                ? { ...c, positionX: entry.positionX, positionY: entry.positionY }
                : c,
            ),
          );
          patchIndexCard(entry.cardId, { positionX: entry.positionX, positionY: entry.positionY }).catch(() => {});
        } else if (entry.type === "card-size") {
          setIndexCards((prev) =>
            prev.map((c) =>
              c.id === entry.cardId ? { ...c, width: entry.width, height: entry.height } : c,
            ),
          );
          patchIndexCard(entry.cardId, { width: entry.width, height: entry.height }).catch(() => {});
        } else if (entry.type === "card-delete") {
          setIndexCards((prev) => prev.filter((c) => c.id !== entry.cardId));
          setEditingCardIds((prev) => {
            const next = new Set(prev);
            next.delete(entry.cardId);
            if (primaryEditingCardIdRef.current === entry.cardId) {
              primaryEditingCardIdRef.current = next.size ? next.values().next().value ?? null : null;
            }
            return next;
          });
          setConnections((prev) =>
            prev.filter((c) => c.fromItemId !== entry.cardId && c.toItemId !== entry.cardId),
          );
          deleteIndexCard(entry.cardId).catch(() => fetchData());
        } else if (entry.type === "card-create") {
          const displayColorKey = resolveCardColorKey(entry.card);
          createIndexCard({
            content: entry.card.content,
            boardId: boardId ?? undefined,
            title: entry.card.title ?? undefined,
            positionX: entry.card.positionX ?? 20,
            positionY: entry.card.positionY ?? 20,
            width: entry.card.width ?? undefined,
            height: entry.card.height ?? undefined,
            color: displayColorKey,
            rotation: entry.card.rotation ?? undefined,
          })
            .then((created) => {
              const restored = { ...created, color: displayColorKey, rotation: entry.card.rotation ?? created.rotation };
              setIndexCards((prev) => (prev.some((c) => c.id === created.id) ? prev : [...prev, restored]));
            })
            .catch(() => {});
        } else if (entry.type === "note-create") {
          const displayColorKey = resolveNoteColorKey(entry.note);
          createNote({
            content: entry.note.content,
            boardId: boardId ?? undefined,
            title: entry.note.title ?? undefined,
            positionX: entry.note.positionX ?? 20,
            positionY: entry.note.positionY ?? 20,
            width: entry.note.width ?? undefined,
            height: entry.note.height ?? undefined,
            color: displayColorKey,
            rotation: entry.note.rotation ?? undefined,
          })
            .then((created) => {
              const restored = { ...created, color: displayColorKey, rotation: entry.note.rotation ?? created.rotation };
              setNotes((prev) => (prev.some((n) => n.id === created.id) ? prev : [...prev, restored]));
            })
            .catch(() => {});
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [boardId, fetchData]);

  // =============================================
  // Sticky Note handlers
  // =============================================

  function getViewportCenterInBoardCoords() {
    const rect = boardViewportRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 400, y: 300 };
    }
    const centerScreenX = rect.width / 2;
    const centerScreenY = rect.height / 2;
    const { contentMinX, contentMinY } = canvasBounds;
    const x = (centerScreenX + contentMinX * (zoom + 1)) / zoom - panX;
    const y = (centerScreenY + contentMinY * (zoom + 1)) / zoom - panY;
    return { x, y };
  }

  function panViewportToBoardPoint(centerX: number, centerY: number) {
    const rect = boardViewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { contentMinX, contentMinY } = canvasBounds;
    const centerScreenX = rect.width / 2;
    const centerScreenY = rect.height / 2;
    const newPanX = (centerScreenX + contentMinX * (zoom + 1)) / zoom - centerX;
    const newPanY = (centerScreenY + contentMinY * (zoom + 1)) / zoom - centerY;
    handleViewportChange(zoom, newPanX, newPanY);
  }

  function getStickyNoteCenter(n: NoteSummaryDto) {
    const x = n.positionX ?? POSITION_DEFAULT;
    const y = n.positionY ?? POSITION_DEFAULT;
    const w = n.width ?? STICKY_NOTE_DEFAULT_SIZE;
    const h = n.height ?? STICKY_NOTE_DEFAULT_SIZE;
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
      setEditingCardIds(new Set());
      primaryEditingNoteIdRef.current = target.id;
      primaryEditingCardIdRef.current = null;
      bringToFront(target.id);
    }
  }

  function handleNavigatePreviousNote() {
    navigateRelativeNote(-1);
  }

  function handleNavigateNextNote() {
    navigateRelativeNote(1);
  }

  async function handleQuickAddNote() {
    if (!boardId) return;
    try {
      const center = getViewportCenterInBoardCoords();
      const positionX = center.x - STICKY_NOTE_DEFAULT_SIZE / 2;
      const positionY = center.y - STICKY_NOTE_DEFAULT_SIZE / 2;

      const created = await createNote({
        content: "",
        boardId,
        positionX,
        positionY,
        width: STICKY_NOTE_DEFAULT_SIZE,
        height: STICKY_NOTE_DEFAULT_SIZE,
      });

      boardRedoStackRef.current = [];
      boardUndoStackRef.current.push({ type: "note-create", note: created });
      setNotes((prev) => [created, ...prev]);
      setEditingNoteIds((prev) => new Set(prev).add(created.id));
      primaryEditingNoteIdRef.current = created.id;
      setEditingCardIds(new Set());
      primaryEditingCardIdRef.current = null;
    } catch {
      // Silently fail - user can retry
    }
  }

  const DRAG_ECHO_IGNORE_MS = 280;
  function handleNoteDragStart(id: string) {
    draggingNoteIdRef.current = id;
  }
  async function handleDragStop(id: string, x: number, y: number) {
    const pending = noteDragMapRef.current.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      noteDragMapRef.current.delete(id);
    }
    const inDeletedRef = deletedNoteIdsRef.current.has(id);
    const inNotesRef = notesRef.current.some((n) => n.id === id);
    if (inDeletedRef) return;
    if (!inNotesRef) return;
    const prevNote = notesRef.current.find((n) => n.id === id);
    if (prevNote && (prevNote.positionX !== x || prevNote.positionY !== y)) {
      boardRedoStackRef.current = [];
      boardUndoStackRef.current.push({
        type: "note-position",
        noteId: id,
        prevPositionX: prevNote.positionX ?? 0,
        prevPositionY: prevNote.positionY ?? 0,
      });
    }
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, positionX: x, positionY: y } : n)),
    );
    // Keep treating this id as "just dragged" so we ignore echo broadcasts (our own PATCH or late throttle)
    window.setTimeout(() => {
      if (draggingNoteIdRef.current === id) draggingNoteIdRef.current = null;
    }, DRAG_ECHO_IGNORE_MS);

    try {
      // Defer to next macrotask so handleDelete (from click-after-mouseup) can run first
      window.setTimeout(() => {
        const inDeletedRef2 = deletedNoteIdsRef.current.has(id);
        const inNotesRef2 = notesRef.current.some((n) => n.id === id);
        if (inDeletedRef2 || !inNotesRef2) return;
        patchNote(id, { positionX: x, positionY: y }).catch(() => {});
      }, 0);
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

  function handleStartEdit(id: string) {
    // Single note in edit mode: clicking another note switches to it (previous saves when isEditing flips)
    setEditingNoteIds(new Set([id]));
    setEditingCardIds(new Set());
    primaryEditingNoteIdRef.current = id;
    primaryEditingCardIdRef.current = null;
    bringToFront(id);
  }

  function handleExitEditNote(id: string) {
    setEditingNoteIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (primaryEditingNoteIdRef.current === id) {
      primaryEditingNoteIdRef.current = null;
    }
  }

  function handleExitEditCard(id: string) {
    setEditingCardIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (primaryEditingCardIdRef.current === id) {
      primaryEditingCardIdRef.current = null;
    }
  }

  async function handleResize(id: string, width: number, height: number) {
    const prevNote = notesRef.current.find((n) => n.id === id);
    if (prevNote && (prevNote.width !== width || prevNote.height !== height)) {
      boardRedoStackRef.current = [];
      boardUndoStackRef.current.push({
        type: "note-size",
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

  const handleRotationChange = useCallback(async (id: string, rotation: number) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, rotation } : n)),
    );

    try {
      await patchNote(id, { rotation });
    } catch {
      // Silently fail
    }
  }, []);

  async function handleDelete(id: string) {
    deletedNoteIdsRef.current.add(id);
    setTimeout(() => deletedNoteIdsRef.current.delete(id), 2000);
    // Clear any pending drag throttle so we don't patch after delete
    const pending = noteDragMapRef.current.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      noteDragMapRef.current.delete(id);
    }
    const deletedNote = notesRef.current.find((n) => n.id === id);
    if (deletedNote) {
      const removedConnections = connectionsRef.current
        .filter((c) => c.fromItemId === id || c.toItemId === id)
        .map((c) => ({ ...c }));
      boardRedoStackRef.current = [];
      boardUndoStackRef.current.push({
        type: "note-delete",
        note: { ...deletedNote },
        removedConnections,
      });
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
    setConnections((prev) =>
      prev.filter((c) => c.fromItemId !== id && c.toItemId !== id),
    );

    try {
      await deleteNote(id);
    } catch {
      fetchData();
    }
  }

  // =============================================
  // Index Card handlers
  // =============================================

  async function handleQuickAddCard() {
    if (!boardId) return;
    const center = getViewportCenterInBoardCoords();
    const positionX = center.x - INDEX_CARD_DEFAULT_W / 2;
    const positionY = center.y - INDEX_CARD_DEFAULT_H / 2;
    const tempId = `temp-card-${nextTempCardId++}`;
    const now = new Date().toISOString();

    const optimisticCard: IndexCardSummaryDto = {
      id: tempId,
      title: null,
      content: "",
      folderId: null,
      projectId: null,
      tags: [],
      createdAt: now,
      updatedAt: now,
      positionX,
      positionY,
      width: null,
      height: null,
      color: null,
      rotation: null,
    };

    setIndexCards((prev) => [...prev, optimisticCard]);
    setEditingCardIds((prev) => new Set(prev).add(tempId));
    primaryEditingCardIdRef.current = tempId;
    setEditingNoteIds(new Set());
    primaryEditingNoteIdRef.current = null;

    try {
      const created = await createIndexCard({
        content: "",
        boardId,
        positionX,
        positionY,
      });

      boardRedoStackRef.current = [];
      boardUndoStackRef.current.push({ type: "card-create", card: created });
      setIndexCards((prev) =>
        prev.map((c) => (c.id === tempId ? created : c)),
      );
      setEditingCardIds((prev) => {
        const next = new Set(prev);
        next.delete(tempId);
        next.add(created.id);
        return next;
      });
      primaryEditingCardIdRef.current = created.id;
    } catch {
      // Card stays in local state with temp ID
    }
  }

  function handleCardDragStart(id: string) {
    draggingCardIdRef.current = id;
  }
  async function handleCardDragStop(id: string, x: number, y: number) {
    const pending = cardDragMapRef.current.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      cardDragMapRef.current.delete(id);
    }
    if (deletedCardIdsRef.current.has(id)) return;
    if (!indexCardsRef.current.some((c) => c.id === id)) return;
    const prevCard = indexCardsRef.current.find((c) => c.id === id);
    if (prevCard && (prevCard.positionX !== x || prevCard.positionY !== y)) {
      boardRedoStackRef.current = [];
      boardUndoStackRef.current.push({
        type: "card-position",
        cardId: id,
        prevPositionX: prevCard.positionX ?? 0,
        prevPositionY: prevCard.positionY ?? 0,
      });
    }
    setIndexCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, positionX: x, positionY: y } : c)),
    );
    window.setTimeout(() => {
      if (draggingCardIdRef.current === id) draggingCardIdRef.current = null;
    }, DRAG_ECHO_IGNORE_MS);

    try {
      if (deletedCardIdsRef.current.has(id) || !indexCardsRef.current.some((c) => c.id === id)) return;
      await patchIndexCard(id, { positionX: x, positionY: y });
    } catch {
      // Silently fail
    }
  }

  async function handleCardSave(id: string, title: string, content: string) {
    setEditingCardIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      if (primaryEditingCardIdRef.current === id) {
        primaryEditingCardIdRef.current = next.size ? next.values().next().value ?? null : null;
      }
      return next;
    });

    setIndexCards((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, title: title || null, content } : c,
      ),
    );

    try {
      await patchIndexCard(id, {
        patchTitle: true,
        title: title || null,
        content: content || undefined,
      });
    } catch {
      // Silently fail
    }
  }

  async function handleCardContentChange(id: string, title: string, content: string) {
    setIndexCards((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, title: title || null, content } : c,
      ),
    );
    try {
      await patchIndexCard(id, {
        patchTitle: true,
        title: title || null,
        content: content || undefined,
      });
    } catch {
      // Silently fail
    }
  }

  function handleCardStartEdit(id: string) {
    setEditingNoteIds(new Set());
    setEditingCardIds(new Set([id]));
    primaryEditingNoteIdRef.current = null;
    primaryEditingCardIdRef.current = id;
    bringToFront(id);
  }

  async function handleCardResize(id: string, width: number, height: number) {
    const prevCard = indexCardsRef.current.find((c) => c.id === id);
    if (prevCard && (prevCard.width !== width || prevCard.height !== height)) {
      boardRedoStackRef.current = [];
      boardUndoStackRef.current.push({
        type: "card-size",
        cardId: id,
        prevWidth: prevCard.width ?? null,
        prevHeight: prevCard.height ?? null,
      });
    }
    lastResizedCardRef.current = { id, at: Date.now() };
    setIndexCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, width, height } : c)),
    );

    try {
      await patchIndexCard(id, { width, height });
    } catch {
      // Silently fail
    }
  }

  async function handleCardColorChange(id: string, color: string) {
    setIndexCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, color } : c)),
    );

    try {
      await patchIndexCard(id, { color });
    } catch {
      // Silently fail
    }
  }

  const handleCardRotationChange = useCallback(async (id: string, rotation: number) => {
    setIndexCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, rotation } : c)),
    );

    try {
      await patchIndexCard(id, { rotation });
    } catch {
      // Silently fail
    }
  }, []);

  async function handleQuickAddImage() {
    if (!boardId) return;
    setPendingImageDrop(null);
    imageFileInputRef.current?.click();
  }

  function handleImageFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !boardId) return;

    const positionX = pendingImageDrop ? pendingImageDrop.x : 30 + Math.random() * 400;
    const positionY = pendingImageDrop ? pendingImageDrop.y : 30 + Math.random() * 300;
    setPendingImageDrop(null);

    uploadBoardImage(boardId, file)
      .then(({ url }) =>
        createBoardImageCard(boardId, {
          imageUrl: url,
          positionX,
          positionY,
        })
      )
      .then((created) => {
        boardRedoStackRef.current = [];
        boardUndoStackRef.current.push({ type: "image-add", image: created });
        setImageCards((prev) => (prev.some((i) => i.id === created.id) ? prev : [...prev, created]));
      })
      .catch(() => {
        // Silently fail
      });
  }

  function handleImageDragStart(id: string) {
    draggingImageIdRef.current = id;
  }
  async function handleImageDragStop(id: string, x: number, y: number) {
    if (draggingImageIdRef.current === id) draggingImageIdRef.current = null;
    if (!imageIdsRef.current.has(id)) return; // Image was deleted (e.g. by another user), skip PATCH
    const prevImg = imageCardsRef.current.find((img) => img.id === id);
    if (prevImg && (prevImg.positionX !== x || prevImg.positionY !== y)) {
      boardRedoStackRef.current = [];
      boardUndoStackRef.current.push({
        type: "image-position",
        cardId: id,
        prevPositionX: prevImg.positionX,
        prevPositionY: prevImg.positionY,
      });
    }
    setImageCards((prev) =>
      prev.map((img) => (img.id === id ? { ...img, positionX: x, positionY: y } : img))
    );
    if (!boardId) return;
    try {
      await patchBoardImageCard(boardId, id, { positionX: x, positionY: y });
    } catch {
      // Silently fail
    }
  }

  async function handleImageResize(
    id: string,
    width: number,
    height: number,
    positionX?: number,
    positionY?: number,
  ) {
    if (!imageIdsRef.current.has(id)) return; // Image was deleted (e.g. by another user), skip PATCH
    const prevImg = imageCardsRef.current.find((img) => img.id === id);
    if (prevImg) {
      const prevW = prevImg.width ?? null;
      const prevH = prevImg.height ?? null;
      if (prevW !== width || prevH !== height || (positionX != null && prevImg.positionX !== positionX) || (positionY != null && prevImg.positionY !== positionY)) {
        boardRedoStackRef.current = [];
        boardUndoStackRef.current.push({
          type: "image-size",
          cardId: id,
          prevWidth: prevW,
          prevHeight: prevH,
          prevPositionX: positionX != null ? prevImg.positionX : undefined,
          prevPositionY: positionY != null ? prevImg.positionY : undefined,
        });
      }
    }
    lastResizedImageRef.current = { id, at: Date.now() };
    setImageCards((prev) =>
      prev.map((img) =>
        img.id === id
          ? { ...img, width, height, ...(positionX != null && { positionX }), ...(positionY != null && { positionY }) }
          : img,
      ),
    );
    if (!boardId) return;
    try {
      const payload: { width: number; height: number; positionX?: number; positionY?: number } = { width, height };
      if (positionX != null) payload.positionX = positionX;
      if (positionY != null) payload.positionY = positionY;
      await patchBoardImageCard(boardId, id, payload);
    } catch {
      // Silently fail
    }
  }

  async function handleImageDelete(id: string) {
    const deletedImg = imageCardsRef.current.find((img) => img.id === id);
    if (deletedImg) {
      boardRedoStackRef.current = [];
      boardUndoStackRef.current.push({ type: "image-delete", image: { ...deletedImg } });
    }
    deletedImageIdsRef.current.add(id);
    setImageCards((prev) => prev.filter((img) => img.id !== id));
    setConnections((prev) => prev.filter((c) => c.fromItemId !== id && c.toItemId !== id));
    if (!boardId) return;
    try {
      await deleteBoardImageCard(boardId, id);
    } catch {
      fetchData();
    }
  }

  async function handleCardDelete(id: string) {
    deletedCardIdsRef.current.add(id);
    setTimeout(() => deletedCardIdsRef.current.delete(id), 2000);
    const pending = cardDragMapRef.current.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      cardDragMapRef.current.delete(id);
    }
    const deletedCard = indexCardsRef.current.find((c) => c.id === id);
    if (deletedCard) {
      boardRedoStackRef.current = [];
      boardUndoStackRef.current.push({ type: "card-delete", card: { ...deletedCard } });
    }
    setIndexCards((prev) => prev.filter((c) => c.id !== id));
    setEditingCardIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      if (primaryEditingCardIdRef.current === id) {
        primaryEditingCardIdRef.current = next.size ? next.values().next().value ?? null : null;
      }
      return next;
    });
    setConnections((prev) =>
      prev.filter((c) => c.fromItemId !== id && c.toItemId !== id),
    );

    try {
      await deleteIndexCard(id);
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

  async function handleDuplicateCard(card: IndexCardSummaryDto) {
    if (!boardId) return;
    setItemContextMenu(null);
    try {
      const created = await createIndexCard({
        boardId,
        title: card.title ?? undefined,
        content: card.content ?? "",
        positionX: (card.positionX ?? 0) + DUPLICATE_OFFSET,
        positionY: (card.positionY ?? 0) + DUPLICATE_OFFSET,
        width: card.width ?? undefined,
        height: card.height ?? undefined,
        color: card.color ?? undefined,
        rotation: card.rotation ?? undefined,
      });
      setIndexCards((prev) => [created, ...prev]);
      bringToFront(created.id);
    } catch {
      // Silently fail
    }
  }

  async function handleDuplicateImage(image: BoardImageSummaryDto) {
    if (!boardId) return;
    setItemContextMenu(null);
    try {
      const created = await createBoardImageCard(boardId, {
        imageUrl: image.imageUrl,
        positionX: image.positionX + DUPLICATE_OFFSET,
        positionY: image.positionY + DUPLICATE_OFFSET,
        width: image.width ?? undefined,
        height: image.height ?? undefined,
        rotation: image.rotation ?? undefined,
      });
      setImageCards((prev) => [created, ...prev]);
      bringToFront(created.id);
    } catch {
      // Silently fail
    }
  }

  function buildItemContextMenuItems(): import("../components/ui/ContextMenu").ContextMenuItem[] {
    if (!itemContextMenu) return [];
    if (itemContextMenu.type === "note") {
      const { note } = itemContextMenu;
      return [
        { label: "Edit", icon: Pencil, onClick: () => handleStartEdit(note.id) },
        { label: "Duplicate", icon: Copy, onClick: () => handleDuplicateNote(note) },
        { label: "Bring to front", icon: Layers, onClick: () => bringToFront(note.id) },
        { label: "Delete", icon: Trash2, onClick: () => handleDelete(note.id), divider: true },
      ];
    }
    if (itemContextMenu.type === "card") {
      const { card } = itemContextMenu;
      return [
        { label: "Edit", icon: Pencil, onClick: () => handleCardStartEdit(card.id) },
        { label: "Duplicate", icon: Copy, onClick: () => handleDuplicateCard(card) },
        { label: "Bring to front", icon: Layers, onClick: () => bringToFront(card.id) },
        { label: "Delete", icon: Trash2, onClick: () => handleCardDelete(card.id), divider: true },
      ];
    }
    const { image } = itemContextMenu;
    return [
      { label: "Duplicate", icon: Copy, onClick: () => handleDuplicateImage(image) },
      { label: "Bring to front", icon: Layers, onClick: () => bringToFront(image.id) },
      { label: "Delete", icon: Trash2, onClick: () => handleImageDelete(image.id), divider: true },
    ];
  }

  // =============================================
  // File save/load and menu actions
  // =============================================

  function handleSaveToFile() {
    const boardName = boardNameRef.current || "Board";
    const payload = createBoardExportPayload("NoteBoard", boardName, {
      notes: notesRef.current,
      indexCards: indexCardsRef.current,
      imageCards: imageCardsRef.current,
      connections: connectionsRef.current,
      viewport: { zoom: zoomRef.current, panX: panXRef.current, panY: panYRef.current },
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    triggerBoardDownload(blob, buildBoardExportFilename(boardName));
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.defaultPrevented) return;
      if (e.key.toLowerCase() !== "s") return;

      e.preventDefault();
      handleSaveToFile();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [boardId]);

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
      if (!payload || payload.boardType !== "NoteBoard") {
        return; // Invalid or wrong board type
      }
      setEditingNoteIds(new Set());
      setEditingCardIds(new Set());
      primaryEditingNoteIdRef.current = null;
      primaryEditingCardIdRef.current = null;
      setRichTextToolbar(null);
      const idMap = new Map<string, string>();

      // Delete existing items
      for (const conn of connections) {
        try {
          await deleteConnection(conn.id);
        } catch {
          // ignore
        }
      }
      for (const img of imageCards) {
        try {
          await deleteBoardImageCard(boardId, img.id);
        } catch {
          // ignore
        }
      }
      for (const card of indexCards) {
        try {
          await deleteIndexCard(card.id);
        } catch {
          // ignore
        }
      }
      for (const note of notes) {
        try {
          await deleteNote(note.id);
        } catch {
          // ignore
        }
      }

      // Create notes
      const newNotes: NoteSummaryDto[] = [];
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
        newNotes.push(created);
      }

      // Create index cards
      const newCards: IndexCardSummaryDto[] = [];
      for (const c of payload.indexCards ?? []) {
        const created = await createIndexCard({
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
        idMap.set(c.id, created.id);
        newCards.push(created);
      }

      // Create image cards
      const newImages: BoardImageSummaryDto[] = [];
      for (const img of payload.imageCards ?? []) {
        const created = await createBoardImageCard(boardId, {
          imageUrl: img.imageUrl,
          positionX: img.positionX,
          positionY: img.positionY,
          width: img.width ?? undefined,
          height: img.height ?? undefined,
          rotation: img.rotation ?? undefined,
        });
        idMap.set(img.id, created.id);
        newImages.push(created);
      }

      // Create connections (with mapped IDs)
      for (const conn of payload.connections ?? []) {
        const fromId = idMap.get(conn.fromItemId);
        const toId = idMap.get(conn.toItemId);
        if (fromId && toId) {
          try {
            await createConnection({
              fromItemId: fromId,
              toItemId: toId,
              boardId,
            });
          } catch {
            // ignore
          }
        }
      }

      // Restore viewport
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

  // =============================================
  // Board drop handler (drag from sidebar)
  // =============================================

  async function handleBoardDrop(type: string, x: number, y: number) {
    if (!boardId) return;

    if (type === "sticky-note") {
      try {
        const created = await createNote({
          content: "",
          boardId,
          positionX: x,
          positionY: y,
          width: STICKY_NOTE_DEFAULT_SIZE,
          height: STICKY_NOTE_DEFAULT_SIZE,
        });
        boardRedoStackRef.current = [];
        boardUndoStackRef.current.push({ type: "note-create", note: created });
        setNotes((prev) => [...prev, created]);
        setEditingNoteIds((prev) => new Set(prev).add(created.id));
        primaryEditingNoteIdRef.current = created.id;
        setEditingCardIds(new Set());
        primaryEditingCardIdRef.current = null;
      } catch {
        // Silently fail
      }
    } else if (type === "image-card") {
      setPendingImageDrop({ x, y });
      imageFileInputRef.current?.click();
    } else if (type === "index-card") {
      const tempId = `temp-card-${nextTempCardId++}`;
      const now = new Date().toISOString();

      const optimisticCard: IndexCardSummaryDto = {
        id: tempId,
        title: null,
        content: "",
        folderId: null,
        projectId: null,
        tags: [],
        createdAt: now,
        updatedAt: now,
        positionX: x,
        positionY: y,
        width: null,
        height: null,
        color: null,
        rotation: null,
      };

      setIndexCards((prev) => [...prev, optimisticCard]);
      setEditingCardIds((prev) => new Set(prev).add(tempId));
      primaryEditingCardIdRef.current = tempId;
      setEditingNoteIds(new Set());
      primaryEditingNoteIdRef.current = null;

      try {
        const created = await createIndexCard({
          content: "",
          boardId,
          positionX: x,
          positionY: y,
        });
        boardRedoStackRef.current = [];
        boardUndoStackRef.current.push({ type: "card-create", card: created });
        setIndexCards((prev) =>
          prev.map((c) => (c.id === tempId ? created : c)),
        );
        setEditingCardIds((prev) => {
          const next = new Set(prev);
          next.delete(tempId);
          next.add(created.id);
          return next;
        });
        primaryEditingCardIdRef.current = created.id;
      } catch {
        // Card stays in local state with temp ID
      }
    }
  }

  // =============================================
  // Red-string linking handlers
  // =============================================

  function handlePinMouseDown(noteId: string) {
    setLinkingFrom(noteId);
    setLinkMousePos(null);
  }

  async function handleDeleteConnection(id: string) {
    const conn = connectionsRef.current.find((c) => c.id === id);
    if (conn) {
      boardRedoStackRef.current = [];
      boardUndoStackRef.current.push({ type: "connection-delete", connection: conn });
    }
    setConnections((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteConnection(id);
    } catch {
      // Silently fail
    }
  }

  // Document-level mousemove / mouseup while linking
  useEffect(() => {
    if (!linkingFrom) return;

    function onMouseMove(e: MouseEvent) {
      const rect = redStringSvgRef.current?.getBoundingClientRect();
      if (!rect) return;
      setLinkMousePos({
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom,
      });
    }

    function onMouseUp(e: MouseEvent) {
      const sourceId = linkingFromRef.current;
      if (!sourceId) {
        setLinkingFrom(null);
        setLinkMousePos(null);
        return;
      }

      const target = document.elementFromPoint(e.clientX, e.clientY);
      const pinEl = target?.closest("[data-pin-note-id]") as HTMLElement | null;
      const targetNoteId = pinEl?.getAttribute("data-pin-note-id");

      if (targetNoteId && targetNoteId !== sourceId) {
        const isDuplicate = connectionsRef.current.some(
          (c) =>
            (c.fromItemId === sourceId && c.toItemId === targetNoteId) ||
            (c.fromItemId === targetNoteId && c.toItemId === sourceId),
        );
        if (!isDuplicate) {
          boardRedoStackRef.current = [];
          createConnection({ fromItemId: sourceId, toItemId: targetNoteId, boardId: boardId ?? undefined })
            .then((created) => {
              boardUndoStackRef.current.push({ type: "connection-create", connection: created });
              setConnections((prev) => [...prev, created]);
            })
            .catch(() => {
              // Silently fail
            });
        }
      }

      setLinkingFrom(null);
      setLinkMousePos(null);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [linkingFrom, boardId, zoom]);

  // =============================================
  // Render
  // =============================================

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-foreground/60">Loading your board...</span>
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
            onClick={fetchData}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isEmpty = notes.length === 0 && indexCards.length === 0 && imageCards.length === 0;

  const boardTopBar = (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="min-w-0 flex-1">
        <BoardMenuBar
          boardType="NoteBoard"
          zoom={zoom}
          onZoomChange={(z) => handleViewportChange(z, panX, panY)}
          onSaveToFile={handleSaveToFile}
          onLoadFromFile={handleLoadFromFile}
          onUndo={triggerMenuUndo}
          onRedo={triggerMenuRedo}
          canUndo={boardUndoStackRef.current.length > 0}
          canRedo={boardRedoStackRef.current.length > 0}
          onInsertStickyNote={handleQuickAddNote}
          onInsertIndexCard={handleQuickAddCard}
          onInsertImage={handleQuickAddImage}
          backgroundTheme={backgroundTheme}
          onBackgroundThemeChange={setBackgroundTheme}
          autoEnlargeNotes={autoEnlargeNotes}
          onAutoEnlargeNotesChange={setAutoEnlargeNotes}
          richTextToolbar={richTextToolbar}
          onNavigatePreviousNote={handleNavigatePreviousNote}
          onNavigateNextNote={handleNavigateNextNote}
          noteNavigationDisabled={notes.length === 0}
        />
      </div>
      {!isHubConnected && <BoardConnectedUsers users={connectedUsers} />}
    </div>
  );

  return (
    <div className="relative flex h-full flex-col">
      <input
        ref={loadFileInputRef}
        type="file"
        accept=".json,.asidenote-board,application/json"
        className="hidden"
        aria-hidden
        onChange={handleLoadFileSelect}
      />
      {/* Board: menu sits inside the cork frame, just below the top wood edge */}
      <div
        ref={boardViewportRef}
        className="relative flex-1 min-h-0"
        onMouseEnter={() => setIsBoardHovered(true)}
        onMouseLeave={() => setIsBoardHovered(false)}
      >
        <CorkBoard
              topBar={boardTopBar}
              boardRef={boardRef}
              onDropItem={handleBoardDrop}
              onBoardMouseMove={handleBoardMouseMove}
              onBoardMouseLeave={handleBoardMouseLeave}
              onBoardClick={(e) => {
                if (!(e.target as Element).closest("[data-board-item]")) {
                  setEditingNoteIds(new Set());
                  setEditingCardIds(new Set());
                  primaryEditingNoteIdRef.current = null;
                  primaryEditingCardIdRef.current = null;
                  setRichTextToolbar(null);
                }
              }}
              zoom={zoom}
              panX={panX}
              panY={panY}
              onViewportChange={handleViewportChange}
              backgroundTheme={backgroundTheme}
              onBoardContextMenu={(e) => setBoardContextMenu({ x: e.clientX, y: e.clientY })}
              canvasWidth={canvasBounds.canvasWidth}
              canvasHeight={canvasBounds.canvasHeight}
              contentMinX={canvasBounds.contentMinX}
              contentMinY={canvasBounds.contentMinY}
            >
          {/* Remote cursors layer (board-space coords, same transform as canvas) */}
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

          <RedStringLayer
            ref={redStringSvgRef}
            connections={connections}
            linkingFrom={linkingFrom}
            mousePos={linkMousePos}
            boardRef={boardRef}
            onDeleteConnection={handleDeleteConnection}
            zoom={zoom}
          />

          {notes.map((note) => (
            <StickyNote
              key={note.id}
              note={note}
              isEditing={editingNoteIds.has(note.id)}
              enlargeWhenEditing={autoEnlargeNotes}
              focusedBy={remoteFocus.get(`note:${note.id}`) ?? null}
              remoteTextCursors={Array.from(remoteTextCursors.entries())
                .filter(([, v]) => v.itemType === "note" && v.itemId === note.id)
                .map(([userId, v]) => ({ userId, field: v.field, position: v.position, color: v.color }))}
              onTextCursor={(field, position) => sendTextCursor("note", note.id, field, position)}
              zIndex={(zIndexMap[note.id] ?? 0) + (editingNoteIds.has(note.id) ? 10000 : 0)}
              onDrag={handleNoteDrag}
              onDragStart={handleNoteDragStart}
              onDragStop={handleDragStop}
              onDelete={handleDelete}
              onDuplicate={(id) => {
                const n = notes.find((note) => note.id === id);
                if (n) handleDuplicateNote(n);
              }}
              onStartEdit={handleStartEdit}
              onSave={handleSave}
              onContentChange={handleNoteContentChange}
              onResize={handleResize}
              onColorChange={handleColorChange}
              onRotationChange={handleRotationChange}
              onPinMouseDown={handlePinMouseDown}
              onBringToFront={bringToFront}
              onUnmount={handleNoteUnmount}
              onExitEdit={handleExitEditNote}
              onContextMenu={(e) => setItemContextMenu({ x: e.clientX, y: e.clientY, type: "note", note })}
              isLinking={linkingFrom !== null}
              zoom={zoom}
              onRichTextToolbarChange={handleRichTextToolbarChange}
            />
          ))}

          {imageCards.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              zIndex={zIndexMap[img.id] ?? 0}
              onDragStart={handleImageDragStart}
              onDragStop={handleImageDragStop}
              onDelete={handleImageDelete}
              onResize={handleImageResize}
              onBringToFront={bringToFront}
              onPinMouseDown={handlePinMouseDown}
              onContextMenu={(e) => setItemContextMenu({ x: e.clientX, y: e.clientY, type: "image", image: img })}
              isLinking={linkingFrom !== null}
              zoom={zoom}
            />
          ))}

          {indexCards.map((card) => (
            <IndexCard
              key={card.id}
              card={card}
              isEditing={editingCardIds.has(card.id)}
              enlargeWhenEditing={autoEnlargeNotes}
              focusedBy={remoteFocus.get(`card:${card.id}`) ?? null}
              zIndex={(zIndexMap[card.id] ?? 0) + (editingCardIds.has(card.id) ? 10000 : 0)}
              onDrag={handleCardDrag}
              onDragStart={handleCardDragStart}
              onDragStop={handleCardDragStop}
              onDelete={handleCardDelete}
              onDuplicate={(id) => {
                const c = indexCards.find((card) => card.id === id);
                if (c) handleDuplicateCard(c);
              }}
              onStartEdit={handleCardStartEdit}
              onSave={handleCardSave}
              onContentChange={handleCardContentChange}
              onResize={handleCardResize}
              onColorChange={handleCardColorChange}
              onRotationChange={handleCardRotationChange}
              onPinMouseDown={handlePinMouseDown}
              onBringToFront={bringToFront}
              onExitEdit={handleExitEditCard}
              onContextMenu={(e) => setItemContextMenu({ x: e.clientX, y: e.clientY, type: "card", card })}
              isLinking={linkingFrom !== null}
              zoom={zoom}
              onRichTextToolbarChange={handleRichTextToolbarChange}
            />
          ))}

          {isEmpty && (
            <div className="flex h-full items-center justify-center" style={{ pointerEvents: "none" }}>
              <div className="text-center">
                <p className="mb-2 text-lg font-medium text-gray-700/70">Your board is empty</p>
                <p className="text-sm text-gray-600/60">
                  Click the + button to add a sticky note, image, or index card
                </p>
              </div>
            </div>
          )}

          <input
            ref={imageFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageFileSelect}
          />
        </CorkBoard>

        {/* Hover-only pan scrollbars (horizontal & vertical) */}
        {isBoardHovered && (
          <div className="pointer-events-none absolute inset-0">
            {/* Horizontal scrollbar (full board width, slightly above bottom border like vertical inset) */}
            <div className="pointer-events-auto absolute bottom-2 left-3 right-3 px-3">
              <input
                type="range"
                min={-5000}
                max={5000}
                defaultValue={0}
                onChange={(e) => {
                  const raw = Number(e.target.value || 0);
                  if (Number.isNaN(raw)) return;
                  const prev = scrollSliderXRef.current;
                  const delta = raw - prev;
                  if (delta !== 0) {
                    const SCROLL_SPEED = 2;
                    const nextPanX = panXRef.current - delta * SCROLL_SPEED;
                    handleViewportChange(zoom, nextPanX, panYRef.current);
                  }
                  // When thumb reaches either end, snap back to center (pan unchanged)
                  if (raw <= -5000 || raw >= 5000) {
                    scrollSliderXRef.current = 0;
                    e.currentTarget.value = "0";
                  } else {
                    scrollSliderXRef.current = raw;
                  }
                }}
                className="board-scrollbar-range board-scrollbar-range-h w-full h-2 cursor-pointer"
              />
            </div>
            {/* Vertical scrollbar (full board height, vertical style, evenly inset from frame) */}
            <div className="pointer-events-auto absolute top-3 bottom-3 right-3 flex items-stretch py-3">
              <input
                type="range"
                min={-5000}
                max={5000}
                defaultValue={0}
                onChange={(e) => {
                  const raw = Number(e.target.value || 0);
                  if (Number.isNaN(raw)) return;
                  const prev = scrollSliderYRef.current;
                  const delta = raw - prev;
                  if (delta !== 0) {
                    const SCROLL_SPEED = 1;
                    const nextPanY = panYRef.current - delta * SCROLL_SPEED;
                    handleViewportChange(zoom, panXRef.current, nextPanY);
                  }
                  if (raw <= -5000 || raw >= 5000) {
                    scrollSliderYRef.current = 0;
                    e.currentTarget.value = "0";
                  } else {
                    scrollSliderYRef.current = raw;
                  }
                }}
                style={{ writingMode: "vertical-rl" }}
                className="board-scrollbar-range board-scrollbar-range-v h-full w-3 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {boardContextMenu && (
          <ContextMenu
            x={boardContextMenu.x}
            y={boardContextMenu.y}
            items={[
              { label: "Add Sticky Note", icon: StickyNoteIcon, onClick: handleQuickAddNote },
              { label: "Add Index Card", icon: CreditCard, onClick: handleQuickAddCard },
              { label: "Add Image", icon: ImageIcon, onClick: handleQuickAddImage },
              { label: "Undo", onClick: triggerMenuUndo, disabled: boardUndoStackRef.current.length === 0, divider: true },
              { label: "Redo", onClick: triggerMenuRedo, disabled: boardRedoStackRef.current.length === 0 },
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
  );
}
