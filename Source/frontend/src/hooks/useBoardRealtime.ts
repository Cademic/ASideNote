import { useCallback, useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { useAuth } from "../context/AuthContext";

const REFETCH_DEBOUNCE_MS = 180;

export interface BoardPresenceUser {
  userId: string;
  displayName: string;
}

function getHubBaseUrl(): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
  if (apiBase && apiBase.startsWith("http")) {
    return apiBase.replace(/\/api\/v1\/?$/, "");
  }
  return "";
}

/** Payload for ImageCardAdded / ImageCardUpdated - full image summary */
export interface ImageCardUpdatePayload {
  id: string;
  imageUrl?: string;
  positionX?: number;
  positionY?: number;
  width?: number | null;
  height?: number | null;
  rotation?: number | null;
}

/** Payload sent with NoteUpdated / IndexCardUpdated when backend has full entity to push */
export interface BoardItemUpdatePayload {
  id: string;
  positionX?: number;
  positionY?: number;
  title?: string | null;
  content?: string | null;
  width?: number | null;
  height?: number | null;
  color?: string | null;
  rotation?: number | null;
}

export interface UseBoardRealtimeOptions {
  /** When false, skips connecting to the hub (e.g. when board is not in a project). Default: true. */
  enabled?: boolean;
  onNoteUpdated?: (payload: BoardItemUpdatePayload) => void;
  onIndexCardUpdated?: (payload: BoardItemUpdatePayload) => void;
  onPresenceUpdate?: (users: BoardPresenceUser[]) => void;
  onUserFocusingItem?: (userId: string, itemType: string, itemId: string | null) => void;
  onCursorPosition?: (userId: string, x: number, y: number) => void;
  onTextCursorPosition?: (userId: string, itemType: string, itemId: string, field: "title" | "content", position: number) => void;
  onUserLeft?: (userId: string) => void;
  /** Called when a note is deleted; merge by removing from state immediately to avoid PATCH-after-delete race. */
  onNoteDeleted?: (noteId: string) => void;
  /** Called when an index card is deleted; merge by removing from state immediately to avoid PATCH-after-delete race. */
  onIndexCardDeleted?: (cardId: string) => void;
  /** Called when an image is deleted; merge by removing from state instead of refetch to avoid stale data. */
  onImageCardDeleted?: (imageId: string) => void;
  /** Called when an image is added with full payload; merge immediately (no refetch). */
  onImageCardAdded?: (payload: ImageCardUpdatePayload) => void;
  /** Called when an image is updated with full payload; merge immediately (no refetch). */
  onImageCardUpdated?: (payload: ImageCardUpdatePayload) => void;
}

export interface UseBoardRealtimeReturn {
  sendFocus: (itemType: string, itemId: string | null) => void;
  sendCursor: (x: number, y: number) => void;
  sendTextCursor: (itemType: string, itemId: string, field: "title" | "content", position: number) => void;
  /** True after the SignalR hub has joined the board (collaboration / presence active). */
  isHubConnected: boolean;
}

/**
 * Connects to the board SignalR hub and calls refetch when any board event is received.
 * Supports presence (PresenceList, UserJoined, UserLeft), focus (UserFocusingItem), and cursor (CursorPosition).
 * Returns sendFocus and sendCursor to broadcast focus/cursor to others.
 */
export function useBoardRealtime(
  boardId: string | undefined,
  refetch: () => void,
  options: UseBoardRealtimeOptions = {},
): UseBoardRealtimeReturn {
  const { accessToken, isAuthenticated } = useAuth();
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const onNoteUpdatedRef = useRef(options.onNoteUpdated);
  const onIndexCardUpdatedRef = useRef(options.onIndexCardUpdated);
  const onPresenceUpdateRef = useRef(options.onPresenceUpdate);
  const onUserFocusingItemRef = useRef(options.onUserFocusingItem);
  const onCursorPositionRef = useRef(options.onCursorPosition);
  const onTextCursorPositionRef = useRef(options.onTextCursorPosition);
  const onUserLeftRef = useRef(options.onUserLeft);
  const onNoteDeletedRef = useRef(options.onNoteDeleted);
  const onIndexCardDeletedRef = useRef(options.onIndexCardDeleted);
  const onImageCardDeletedRef = useRef(options.onImageCardDeleted);
  const onImageCardAddedRef = useRef(options.onImageCardAdded);
  const onImageCardUpdatedRef = useRef(options.onImageCardUpdated);
  onNoteUpdatedRef.current = options.onNoteUpdated;
  onIndexCardUpdatedRef.current = options.onIndexCardUpdated;
  onPresenceUpdateRef.current = options.onPresenceUpdate;
  onUserFocusingItemRef.current = options.onUserFocusingItem;
  onCursorPositionRef.current = options.onCursorPosition;
  onTextCursorPositionRef.current = options.onTextCursorPosition;
  onUserLeftRef.current = options.onUserLeft;
  onNoteDeletedRef.current = options.onNoteDeleted;
  onIndexCardDeletedRef.current = options.onIndexCardDeleted;
  onImageCardDeletedRef.current = options.onImageCardDeleted;
  onImageCardAddedRef.current = options.onImageCardAdded;
  onImageCardUpdatedRef.current = options.onImageCardUpdated;

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const boardIdRef = useRef<string | undefined>(boardId);
  boardIdRef.current = boardId;

  const sendFocus = useCallback((itemType: string, itemId: string | null) => {
    const bid = boardIdRef.current;
    if (!bid) return;
    connectionRef.current?.invoke("UserFocusingItem", bid, itemType, itemId).catch(() => {});
  }, []);
  const sendCursor = useCallback((x: number, y: number) => {
    const bid = boardIdRef.current;
    if (!bid) return;
    connectionRef.current?.invoke("CursorPosition", bid, x, y).catch(() => {});
  }, []);

  const sendTextCursor = useCallback((itemType: string, itemId: string, field: "title" | "content", position: number) => {
    const bid = boardIdRef.current;
    if (!bid) return;
    connectionRef.current?.invoke("TextCursorPosition", bid, itemType, itemId, field, position).catch(() => {});
  }, []);

  const enabled = options.enabled !== false;
  const [isHubConnected, setIsHubConnected] = useState(false);

  useEffect(() => {
    if (!boardId || !isAuthenticated || !accessToken || !enabled) {
      setIsHubConnected(false);
      return;
    }

    const base = `${getHubBaseUrl()}/hubs/board`;
    const hubUrl = `${base}${base.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(accessToken)}`;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          return 30000;
        },
      })
      .build();

    connectionRef.current = connection;

    connection.onclose((error) => {
      setIsHubConnected(false);
      if (import.meta.env.DEV) {
        console.warn("[useBoardRealtime] Closed:", error?.message);
      }
    });
    connection.onreconnecting(() => setIsHubConnected(false));
    connection.onreconnected(() => {
      setIsHubConnected(true);
      connection.invoke("JoinBoard", boardId).catch(() => {});
    });

    let presenceList: BoardPresenceUser[] = [];
    const applyPresence = () => onPresenceUpdateRef.current?.(presenceList);

    const handlePresenceList = (list: Array<{ userId: string; displayName: string }>) => {
      presenceList = (list ?? []).map((u) => ({ userId: String(u.userId), displayName: u.displayName ?? "" }));
      applyPresence();
    };
    const handleUserJoined = (userId: string, displayName: string) => {
      const id = String(userId);
      if (presenceList.some((u) => u.userId === id)) return;
      presenceList = [...presenceList, { userId: id, displayName: displayName ?? "" }];
      applyPresence();
    };
    const handleUserLeft = (userId: string) => {
      const id = String(userId);
      presenceList = presenceList.filter((u) => u.userId !== id);
      applyPresence();
      onUserLeftRef.current?.(id);
    };
    const handleUserFocusingItem = (userId: string, itemType: string, itemId: string | null) => {
      onUserFocusingItemRef.current?.(String(userId), itemType ?? "", itemId ?? null);
    };
    const handleCursorPosition = (userId: string, x: number, y: number) => {
      onCursorPositionRef.current?.(String(userId), x, y);
    };
    const handleTextCursorPosition = (userId: string, itemType: string, itemId: string, field: string, position: number) => {
      onTextCursorPositionRef.current?.(String(userId), itemType ?? "", itemId ?? "", (field === "title" ? "title" : "content") as "title" | "content", position);
    };

    connection.on("PresenceList", handlePresenceList);
    connection.on("UserJoined", handleUserJoined);
    connection.on("UserLeft", handleUserLeft);
    connection.on("UserFocusingItem", handleUserFocusingItem);
    connection.on("CursorPosition", handleCursorPosition);
    connection.on("TextCursorPosition", handleTextCursorPosition);

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let hasRefetchedRecently = false;

    const scheduleRefetch = () => {
      const doRefetch = () => {
        debounceTimer = null;
        hasRefetchedRecently = false;
        refetchRef.current();
      };
      if (!hasRefetchedRecently) {
        hasRefetchedRecently = true;
        doRefetch();
      } else {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(doRefetch, REFETCH_DEBOUNCE_MS);
      }
    };

    // Server sends a single object: { boardId, noteId, payload? } or { boardId, cardId, payload? }
    const handleNoteUpdated = (msg: { boardId?: string; noteId?: string; payload?: BoardItemUpdatePayload }) => {
      const payload = msg?.payload;
      if (payload != null && typeof payload === "object" && onNoteUpdatedRef.current) {
        const normalized = { ...payload, id: String(payload.id ?? msg.noteId ?? "") };
        onNoteUpdatedRef.current(normalized);
      } else {
        scheduleRefetch();
      }
    };
    const handleIndexCardUpdated = (msg: { boardId?: string; cardId?: string; payload?: BoardItemUpdatePayload }) => {
      const payload = msg?.payload;
      if (payload != null && typeof payload === "object" && onIndexCardUpdatedRef.current) {
        const normalized = { ...payload, id: String(payload.id ?? msg.cardId ?? "") };
        onIndexCardUpdatedRef.current(normalized);
      } else {
        scheduleRefetch();
      }
    };

    connection.on("NoteAdded", scheduleRefetch);
    connection.on("NoteUpdated", handleNoteUpdated);
    const handleNoteDeleted = (msg: { boardId?: string; noteId?: string }) => {
      const id = msg?.noteId != null ? String(msg.noteId) : null;
      if (id && onNoteDeletedRef.current) {
        onNoteDeletedRef.current(id);
      } else {
        scheduleRefetch();
      }
    };
    connection.on("NoteDeleted", handleNoteDeleted);
    connection.on("IndexCardAdded", scheduleRefetch);
    connection.on("IndexCardUpdated", handleIndexCardUpdated);
    const handleIndexCardDeleted = (msg: { boardId?: string; cardId?: string }) => {
      const id = msg?.cardId != null ? String(msg.cardId) : null;
      if (id && onIndexCardDeletedRef.current) {
        onIndexCardDeletedRef.current(id);
      } else {
        scheduleRefetch();
      }
    };
    connection.on("IndexCardDeleted", handleIndexCardDeleted);
    connection.on("ConnectionAdded", scheduleRefetch);
    connection.on("ConnectionDeleted", scheduleRefetch);
    const handleImageCardDeleted = (msg: { boardId?: string; imageId?: string }) => {
      const id = msg?.imageId != null ? String(msg.imageId) : null;
      if (id && onImageCardDeletedRef.current) {
        onImageCardDeletedRef.current(id);
      } else {
        scheduleRefetch();
      }
    };
    const handleImageCardAdded = (msg: { boardId?: string; imageId?: string; payload?: ImageCardUpdatePayload }) => {
      const payload = msg?.payload;
      if (payload != null && typeof payload === "object" && onImageCardAddedRef.current) {
        const normalized = { ...payload, id: String(payload.id ?? msg.imageId ?? "") };
        onImageCardAddedRef.current(normalized);
      } else {
        scheduleRefetch();
      }
    };
    const handleImageCardUpdated = (msg: { boardId?: string; imageId?: string; payload?: ImageCardUpdatePayload }) => {
      const payload = msg?.payload;
      if (payload != null && typeof payload === "object" && onImageCardUpdatedRef.current) {
        const normalized = { ...payload, id: String(payload.id ?? msg.imageId ?? "") };
        onImageCardUpdatedRef.current(normalized);
      } else {
        scheduleRefetch();
      }
    };
    connection.on("ImageCardAdded", handleImageCardAdded);
    connection.on("ImageCardUpdated", handleImageCardUpdated);
    connection.on("ImageCardDeleted", handleImageCardDeleted);
    connection.on("DrawingUpdated", scheduleRefetch);

    let cancelled = false;
    // Defer start so React Strict Mode cleanup doesn't abort the first negotiation
    const startId = window.setTimeout(() => {
      connection
        .start()
        .then(() => {
          if (cancelled) return;
          if (import.meta.env.DEV) console.log("[useBoardRealtime] Connected, joining board:", boardId);
          return connection.invoke("JoinBoard", boardId);
        })
        .then(() => {
          if (cancelled) return;
          setIsHubConnected(true);
          if (import.meta.env.DEV) console.log("[useBoardRealtime] Joined board:", boardId);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setIsHubConnected(false);
          if (import.meta.env.DEV) {
            const e = err as Error & { message?: string };
            console.error("[useBoardRealtime] Failed:", e?.message ?? String(err));
          }
        });
    }, 0);

    return () => {
      cancelled = true;
      connectionRef.current = null;
      window.clearTimeout(startId);
      if (debounceTimer) clearTimeout(debounceTimer);
      connection.off("PresenceList", handlePresenceList);
      connection.off("UserJoined", handleUserJoined);
      connection.off("UserLeft", handleUserLeft);
      connection.off("UserFocusingItem", handleUserFocusingItem);
      connection.off("CursorPosition", handleCursorPosition);
      connection.off("TextCursorPosition", handleTextCursorPosition);
      connection.off("NoteAdded", scheduleRefetch);
      connection.off("NoteUpdated", handleNoteUpdated);
      connection.off("NoteDeleted", handleNoteDeleted);
      connection.off("IndexCardAdded", scheduleRefetch);
      connection.off("IndexCardUpdated", handleIndexCardUpdated);
      connection.off("IndexCardDeleted", handleIndexCardDeleted);
      connection.off("ConnectionAdded", scheduleRefetch);
      connection.off("ConnectionDeleted", scheduleRefetch);
      connection.off("ImageCardAdded", handleImageCardAdded);
      connection.off("ImageCardUpdated", handleImageCardUpdated);
      connection.off("ImageCardDeleted", handleImageCardDeleted);
      connection.off("DrawingUpdated", scheduleRefetch);
      connection.invoke("LeaveBoard", boardId).catch(() => {});
      connection.stop();
    };
  }, [boardId, isAuthenticated, accessToken, enabled]);

  return { sendFocus, sendCursor, sendTextCursor, isHubConnected };
}
