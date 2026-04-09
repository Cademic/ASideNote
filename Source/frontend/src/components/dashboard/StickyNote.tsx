/* eslint-disable react-refresh/only-export-components */
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import Draggable, { type DraggableEventHandler } from "react-draggable";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import CharacterCount from "@tiptap/extension-character-count";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import { X, GripVertical, MoreVertical, Copy, Trash2, RotateCw } from "lucide-react";
import { handleTabKey } from "../../lib/tiptap-tab-indent";
import type { NoteSummaryDto } from "../../types";
import { FontSize } from "../../lib/tiptap-font-size";
import type { BoardRichTextToolbarState } from "./BoardMenuBar";
import { ROTATION_PRESETS } from "./noteToolbarConstants";
import { NoteBodyLimits } from "../../lib/tiptap-note-body-limits";
import { stripHtmlForPlainText } from "../../lib/stripHtmlForPlainText";

interface StickyNoteProps {
  note: NoteSummaryDto;
  isEditing: boolean;
  zIndex?: number;
  onDragStop: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  /** Optional: duplicate this note (e.g. create a copy on the board) */
  onDuplicate?: (id: string) => void;
  onStartEdit: (id: string) => void;
  onSave: (id: string, title: string, content: string) => void;
  /** Optional: called on debounced content/title change while editing (for real-time sync). If not provided, debounced save is skipped. */
  onContentChange?: (id: string, title: string, content: string) => void;
  onResize: (id: string, width: number, height: number) => void;
  onColorChange: (id: string, color: string) => void;
  onRotationChange: (id: string, rotation: number) => void;
  onPinMouseDown?: (noteId: string) => void;
  onDrag?: (id: string, x: number, y: number) => void;
  onDragStart?: (id: string) => void;
  onBringToFront?: (id: string) => void;
  /** True when any note on the board is being linked (used for pin hover styling) */
  isLinking?: boolean;
  /** When other user(s) are focusing this note, show a border in their color(s). Multiple users can edit at once. */
  focusedBy?: { userId: string; color: string }[] | null;
  /** Remote text cursor positions (userId -> field, position, color) for collaborative editing */
  remoteTextCursors?: { userId: string; field: "title" | "content"; position: number; color: string }[];
  /** Callback to broadcast local text cursor position */
  onTextCursor?: (field: "title" | "content", position: number) => void;
  /** Called when this note unmounts (so parent can skip late drag-stop patches) */
  onUnmount?: (id: string) => void;
  /** Called when user clicks the drag handle while editing (to exit edit mode) */
  onExitEdit?: (id: string) => void;
  /** Called when user right-clicks the note (for context menu). Call e.preventDefault() and e.stopPropagation() before showing menu. */
  onContextMenu?: (e: React.MouseEvent) => void;
  zoom?: number;
  /** When true, visually scale the note when editing (for better readability) */
  enlargeWhenEditing?: boolean;
  /** Registers the active TipTap editor with the board menu bar while editing */
  onRichTextToolbarChange?: (state: BoardRichTextToolbarState | null, clearedSourceId?: string) => void;
  /** Parent can request this note to run delete flow (used by board-level context menu). */
  requestDeleteConfirm?: boolean;
  /** Called after a parent delete request has been handled/opened. */
  onDeleteConfirmHandled?: (id: string) => void;
}

/** Default width and height for sticky notes on boards (square). */
export const STICKY_NOTE_DEFAULT_SIZE = 270;
/** Hard cap on note height when resizing (px). */
export const STICKY_NOTE_MAX_HEIGHT = 600;
const DEFAULT_SIZE = STICKY_NOTE_DEFAULT_SIZE;
const MIN_SIZE = 120;
const MAX_WIDTH = 600;
/** Plain-text character budget for note body (TipTap CharacterCount). */
const MAX_CONTENT_TEXT_LENGTH = 1000;
/** Max paragraph blocks (Enter). Existing notes above this can still be edited down. */
const MAX_CONTENT_PARAGRAPHS = 40;
/** Max soft line breaks (Shift+Enter). */
const MAX_CONTENT_HARD_BREAKS = 60;
/** Title plain-text length; matches API validators (`MaximumLength(500)` on note title). */
const MAX_TITLE_TEXT_LENGTH = 500;
/** Title is a single paragraph block (Enter cannot add another). */
const MAX_TITLE_PARAGRAPHS = 1;
/** Soft line breaks allowed in title (Shift+Enter). */
const MAX_TITLE_HARD_BREAKS = 20;

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const CURSOR_MAP: Record<ResizeDir, string> = {
  n: "cursor-ns-resize",
  s: "cursor-ns-resize",
  e: "cursor-ew-resize",
  w: "cursor-ew-resize",
  ne: "cursor-nesw-resize",
  sw: "cursor-nesw-resize",
  nw: "cursor-nwse-resize",
  se: "cursor-nwse-resize",
};

export const NOTE_COLORS: Record<string, { bg: string; pin: string }> = {
  yellow: { bg: "bg-yellow-200 dark:bg-yellow-300", pin: "bg-red-500" },
  pink: { bg: "bg-pink-200 dark:bg-pink-300", pin: "bg-blue-500" },
  blue: { bg: "bg-blue-200 dark:bg-blue-300", pin: "bg-yellow-500" },
  green: { bg: "bg-green-200 dark:bg-green-300", pin: "bg-red-500" },
  orange: { bg: "bg-orange-200 dark:bg-orange-300", pin: "bg-blue-500" },
  purple: { bg: "bg-purple-200 dark:bg-purple-300", pin: "bg-yellow-500" },
};

function resolveNoteColorKey(note: NoteSummaryDto): string {
  const colors = NOTE_COLORS ?? {};
  if (note.color && colors[note.color]) return note.color;
  let hash = 0;
  for (let i = 0; i < note.id.length; i++) {
    hash = note.id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const keys = Object.keys(colors);
  return keys[Math.abs(hash) % keys.length] ?? "yellow";
}

interface RemoteCaretProps {
  editor: ReturnType<typeof useEditor>;
  position: number;
  color: string;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}

function RemoteCaret({ editor, position, color, wrapperRef }: RemoteCaretProps) {
  const [style, setStyle] = useState<{ left: number; top: number; height: number } | null>(null);

  const docSize = editor?.state?.doc?.content?.size ?? 0;
  useLayoutEffect(() => {
    if (!editor?.view || !wrapperRef.current) {
      setStyle(null);
      return;
    }
    const pos = Math.min(Math.max(0, position), docSize);
    const run = () => {
      try {
        const coords = editor.view.coordsAtPos(pos);
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();
        setStyle({
          left: coords.left - rect.left,
          top: coords.top - rect.top,
          height: coords.bottom - coords.top,
        });
      } catch {
        setStyle(null);
      }
    };
    const id = requestAnimationFrame(run);
    return () => cancelAnimationFrame(id);
  }, [editor, position, wrapperRef, docSize]);

  if (!style) return null;
  return (
    <div
      className="absolute z-10 pointer-events-none"
      style={{
        left: style.left,
        top: style.top,
        width: 2,
        height: Math.min(120, Math.max(16, style.height)),
        backgroundColor: color,
      }}
    />
  );
}

export function StickyNote({
  note,
  isEditing,
  zIndex = 0,
  onDragStop,
  onDelete,
  onDuplicate,
  onStartEdit,
  onSave,
  onContentChange,
  onResize,
  onColorChange,
  onRotationChange,
  onPinMouseDown,
  onDrag,
  onDragStart,
  onBringToFront,
  isLinking,
  focusedBy,
  remoteTextCursors = [],
  onTextCursor,
  onUnmount,
  onExitEdit,
  onContextMenu,
  zoom = 1,
  enlargeWhenEditing = false,
  onRichTextToolbarChange,
  requestDeleteConfirm = false,
  onDeleteConfirmHandled,
}: StickyNoteProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const ignoreBlurUntilRef = useRef<number>(0);
  const lastDragEndRef = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const colorKey = resolveNoteColorKey(note);
  const color = NOTE_COLORS[colorKey];

  const [activeField, setActiveField] = useState<"title" | "content">("title");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({
    width: note.width ?? DEFAULT_SIZE,
    height: note.height ?? DEFAULT_SIZE,
  });
  const [position, setPosition] = useState({
    x: note.positionX ?? 20,
    y: note.positionY ?? 20,
  });
  const [isResizing, setIsResizing] = useState(false);

  // --- TipTap editors ---
  const sharedExtensions = [
    StarterKit.configure({ heading: false, link: false }),
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    TextAlign.configure({ types: ["paragraph"] }),
    Link.configure({ openOnClick: false }),
    Highlight.configure({ multicolor: true }),
  ];

  const sendTextCursorIfNeeded = useCallback(
    (editor: ReturnType<typeof useEditor>, field: "title" | "content") => {
      if (!onTextCursor || !editor) return;
      const pos = editor.state.selection.from;
      onTextCursor(field, pos);
    },
    [onTextCursor],
  );

  const titleEditor = useEditor({
    extensions: [
      ...sharedExtensions,
      CharacterCount.configure({ limit: MAX_TITLE_TEXT_LENGTH }),
      NoteBodyLimits.configure({
        maxParagraphs: MAX_TITLE_PARAGRAPHS,
        maxHardBreaks: MAX_TITLE_HARD_BREAKS,
      }),
    ],
    content: note.title || "",
    editable: isEditing,
    editorProps: {
      attributes: {
        class:
          "prose-none w-full bg-transparent text-sm font-semibold text-gray-800 focus:outline-none break-words",
      },
      handleKeyDown: handleTabKey,
    },
    onFocus: ({ editor }) => {
      setActiveField("title");
      sendTextCursorIfNeeded(editor, "title");
    },
  });

  const contentEditor = useEditor({
    extensions: [
      ...sharedExtensions,
      CharacterCount.configure({ limit: MAX_CONTENT_TEXT_LENGTH }),
      NoteBodyLimits.configure({
        maxParagraphs: MAX_CONTENT_PARAGRAPHS,
        maxHardBreaks: MAX_CONTENT_HARD_BREAKS,
      }),
    ],
    content: note.content || "",
    editable: isEditing,
    editorProps: {
      attributes: {
        class:
          "prose-none w-full bg-transparent text-xs text-gray-700 focus:outline-none min-h-[40px] break-words",
      },
      handleKeyDown: handleTabKey,
    },
    onFocus: ({ editor }) => {
      setActiveField("content");
      sendTextCursorIfNeeded(editor, "content");
    },
  });

  const titleCharCount = useEditorState({
    editor: titleEditor,
    selector: ({ editor }) => editor?.storage.characterCount?.characters() ?? 0,
  });

  const contentCharCount = useEditorState({
    editor: contentEditor,
    selector: ({ editor }) => editor?.storage.characterCount?.characters() ?? 0,
  });

  const activeEditor =
    activeField === "title" ? titleEditor : contentEditor;

  const titleEditorWrapperRef = useRef<HTMLDivElement>(null);
  const contentEditorWrapperRef = useRef<HTMLDivElement>(null);
  const textCursorThrottleRef = useRef<number>(0);
  const TEXT_CURSOR_THROTTLE_MS = 80;

  // Broadcast text cursor position when selection changes (throttled)
  useEffect(() => {
    if (!onTextCursor || !isEditing) return;
    const editors = [
      { editor: titleEditor, field: "title" as const },
      { editor: contentEditor, field: "content" as const },
    ];
    const handlers: (() => void)[] = [];
    for (const { editor, field } of editors) {
      if (!editor) continue;
      const handler = () => {
        const now = Date.now();
        if (now - textCursorThrottleRef.current < TEXT_CURSOR_THROTTLE_MS) return;
        textCursorThrottleRef.current = now;
        const pos = editor.state.selection.from;
        onTextCursor(field, pos);
      };
      editor.on("selectionUpdate", handler);
      handlers.push(() => editor.off("selectionUpdate", handler));
    }
    return () => handlers.forEach((cleanup) => cleanup());
  }, [onTextCursor, isEditing, titleEditor, contentEditor]);

  // Toggle editable when isEditing changes
  useEffect(() => {
    titleEditor?.setEditable(isEditing);
    contentEditor?.setEditable(isEditing);
    if (isEditing) {
      ignoreBlurUntilRef.current = Date.now() + 2000;
    }
  }, [titleEditor, contentEditor, isEditing]);
  
  useEffect(() => {
    if (focusedBy && focusedBy.length > 0) {
      ignoreBlurUntilRef.current = Date.now() + 2000;
    }
  }, [focusedBy]);
  
  useEffect(() => {
    if (isEditing) {
      ignoreBlurUntilRef.current = Date.now() + 2000;
    }
  }, [note.title, note.content, note.positionX, note.positionY, note.width, note.height, note.color, note.rotation, isEditing]);

  // Sync title editor from props
  useEffect(() => {
    if (!titleEditor) return;
    if (isEditing && titleEditor.isFocused) return;
    const currentHtml = titleEditor.getHTML();
    const propHtml = note.title ?? "";
    if (currentHtml !== propHtml && propHtml !== undefined) {
      if (!isEditing) {
        if (!titleEditor.isFocused) {
          titleEditor.commands.setContent(propHtml || "", { emitUpdate: false });
        }
      } else {
        titleEditor.commands.setContent(propHtml || "", { emitUpdate: false });
      }
    }
  }, [note.title, isEditing, titleEditor]);

  // Sync content editor from props
  useEffect(() => {
    if (!contentEditor) return;
    if (isEditing && contentEditor.isFocused) return;
    const currentHtml = contentEditor.getHTML();
    const propHtml = note.content ?? "";
    if (currentHtml !== propHtml && propHtml !== undefined) {
      if (!isEditing) {
        if (!contentEditor.isFocused) {
          contentEditor.commands.setContent(propHtml || "", { emitUpdate: false });
        }
      } else {
        contentEditor.commands.setContent(propHtml || "", { emitUpdate: false });
      }
    }
  }, [note.content, isEditing, contentEditor]);

  // Save immediately while typing (minimal debounce); on exit edit flush so text is never lost
  const SAVE_DEBOUNCE_MS = 0;
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;
  useEffect(() => {
    if (!onContentChangeRef.current || !isEditing || !titleEditor || !contentEditor) return;
    const flush = () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = null;
      }
      onContentChangeRef.current?.(note.id, titleEditor.getHTML(), contentEditor.getHTML());
    };
    const onUpdate = () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
    };
    titleEditor.on("update", onUpdate);
    contentEditor.on("update", onUpdate);
    return () => {
      titleEditor.off("update", onUpdate);
      contentEditor.off("update", onUpdate);
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = null;
      flush();
    };
  }, [isEditing, note.id, titleEditor, contentEditor]);

  // Keep stable refs for parent callbacks so resize handlers never go stale
  const onResizeRef = useRef(onResize);
  const onDragStopRef = useRef(onDragStop);
  onResizeRef.current = onResize;
  onDragStopRef.current = onDragStop;

  // Sync size from props only when note prop values actually change and not resizing
  useEffect(() => {
    if (isResizing) return;
    const w = note.width ?? DEFAULT_SIZE;
    const h = note.height ?? DEFAULT_SIZE;
    setSize((prev) => {
      if (prev.width === w && prev.height === h) return prev;
      return { width: w, height: h };
    });
  }, [note.width, note.height, isResizing]);

  // Sync position from props only when note prop values actually change and not resizing
  useEffect(() => {
    if (isResizing) return;
    const x = note.positionX ?? 20;
    const y = note.positionY ?? 20;
    setPosition((prev) => {
      if (prev.x === x && prev.y === y) return prev;
      return { x, y };
    });
  }, [note.positionX, note.positionY, isResizing]);

  // Track which field was clicked and the vertical ratio within it
  const pendingClickRef = useRef<{
    field: "title" | "content";
    yRatio: number; // 0..1 representing where in the field the click landed
  } | null>(null);

  // When entering edit mode, place the cursor on the line the user clicked
  useEffect(() => {
    if (!isEditing || !titleEditor || !contentEditor) return;

    const click = pendingClickRef.current;
    pendingClickRef.current = null;

    if (!click) {
      contentEditor.commands.focus("end");
      setActiveField("content");
      return;
    }

    const editor = click.field === "title" ? titleEditor : contentEditor;
    setActiveField(click.field);

    // Wait a tick for the editor DOM to be fully laid out
    requestAnimationFrame(() => {
      const editorEl = editor.view.dom;
      const rect = editorEl.getBoundingClientRect();

      // Map the yRatio to a viewport Y coordinate within the editor
      const targetY = rect.top + click.yRatio * rect.height;
      // Use the horizontal center of the editor for the X
      const targetX = rect.left + rect.width / 2;

      const pos = editor.view.posAtCoords({ left: targetX, top: targetY });
      if (pos) {
        editor.commands.focus();
        editor.commands.setTextSelection(pos.pos);
      } else {
        editor.commands.focus("end");
      }
    });
  }, [isEditing, titleEditor, contentEditor]);

  // Auto-grow height based on content in read mode (skip during resize)
  useEffect(() => {
    if (isResizing) return;
    if (!isEditing && contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      const totalNeeded = contentHeight + 40;
      const currentHeight = note.height ?? DEFAULT_SIZE;
      if (totalNeeded > currentHeight) {
        const parent = nodeRef.current?.parentElement;
        const boardH = parent?.clientHeight ?? 9999;
        const maxAvailable = boardH - (note.positionY ?? 20);
        const clampedHeight = Math.min(totalNeeded, maxAvailable);
        setSize((prev) => {
          if (prev.height >= clampedHeight) return prev;
          return { ...prev, height: clampedHeight };
        });
      }
    }
  }, [note.content, note.title, note.tags, isEditing, note.height, note.positionY, isResizing]);

  const handleDragStop: DraggableEventHandler = (_e, data) => {
    setPosition({ x: data.x, y: data.y });
    lastDragEndRef.current = Date.now();
    onDragStop(note.id, data.x, data.y);
  };

  // Do not close edit mode on blur (e.g. tab switch). Close only when user clicks another note or board.
  const handleBlur = useCallback(() => {
    // No-op: keep edit mode on; parent will remove from editingNoteIds on board click or other-note click
  }, []);

  useLayoutEffect(() => {
    return () => {
      onUnmount?.(note.id);
    };
  }, [note.id, onUnmount]);

  // When parent removes this note from editing (isEditing -> false), save current content once
  const wasEditingRef = useRef(false);
  useEffect(() => {
    if (wasEditingRef.current && !isEditing && titleEditor && contentEditor) {
      const titleHtml = titleEditor.getHTML();
      const contentHtml = contentEditor.getHTML();
      onSave(note.id, titleHtml, contentHtml);
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, titleEditor, contentEditor, note.id, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && titleEditor && contentEditor) {
        const titleHtml = titleEditor.getHTML();
        const contentHtml = contentEditor.getHTML();
        onSave(note.id, titleHtml, contentHtml);
      }
    },
    [titleEditor, contentEditor, note.id, onSave],
  );

  useEffect(() => {
    if (!onRichTextToolbarChange) return;
    if (!isEditing) {
      onRichTextToolbarChange(null, note.id);
      return;
    }
    onRichTextToolbarChange({
      sourceId: note.id,
      editor: activeEditor,
    });
  }, [isEditing, activeEditor, activeField, titleEditor, contentEditor, note.id, onRichTextToolbarChange]);

  useEffect(() => {
    return () => {
      onRichTextToolbarChange?.(null, note.id);
    };
  }, [onRichTextToolbarChange, note.id]);

  // --- Resize logic using a single stable ref for all mutable state ---
  const resizeRef = useRef<{
    dir: ResizeDir;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startPosX: number;
    startPosY: number;
    boardW: number;
    boardH: number;
  } | null>(null);

  const listenersRef = useRef<{
    move: (e: MouseEvent) => void;
    up: (e: MouseEvent) => void;
  } | null>(null);

  function startResize(dir: ResizeDir) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (listenersRef.current) {
        document.removeEventListener("mousemove", listenersRef.current.move);
        document.removeEventListener("mouseup", listenersRef.current.up);
      }

      const parent = nodeRef.current?.parentElement;
      const boardW = parent?.clientWidth ?? 9999;
      const boardH = parent?.clientHeight ?? 9999;

      resizeRef.current = {
        dir,
        startX: e.clientX,
        startY: e.clientY,
        startW: size.width,
        startH: size.height,
        startPosX: position.x,
        startPosY: position.y,
        boardW,
        boardH,
      };

      setIsResizing(true);

      function onMove(ev: MouseEvent) {
        const rs = resizeRef.current;
        if (!rs) return;

        const dx = (ev.clientX - rs.startX) / zoom;
        const dy = (ev.clientY - rs.startY) / zoom;

        let newW = rs.startW;
        let newH = rs.startH;
        let newX = rs.startPosX;
        let newY = rs.startPosY;

        if (rs.dir === "e" || rs.dir === "ne" || rs.dir === "se") {
          newW = Math.min(MAX_WIDTH, Math.max(MIN_SIZE, rs.startW + dx));
        }
        if (rs.dir === "w" || rs.dir === "nw" || rs.dir === "sw") {
          const proposed = rs.startW - dx;
          if (proposed >= MIN_SIZE && proposed <= MAX_WIDTH) {
            newW = proposed;
            newX = rs.startPosX + dx;
          } else if (proposed < MIN_SIZE) {
            newW = MIN_SIZE;
            newX = rs.startPosX + (rs.startW - MIN_SIZE);
          } else {
            newW = MAX_WIDTH;
            newX = rs.startPosX + (rs.startW - MAX_WIDTH);
          }
        }
        if (rs.dir === "s" || rs.dir === "se" || rs.dir === "sw") {
          newH = Math.min(STICKY_NOTE_MAX_HEIGHT, Math.max(MIN_SIZE, rs.startH + dy));
        }
        if (rs.dir === "n" || rs.dir === "ne" || rs.dir === "nw") {
          const proposed = rs.startH - dy;
          if (proposed >= MIN_SIZE && proposed <= STICKY_NOTE_MAX_HEIGHT) {
            newH = proposed;
            newY = rs.startPosY + dy;
          } else if (proposed < MIN_SIZE) {
            newH = MIN_SIZE;
            newY = rs.startPosY + (rs.startH - MIN_SIZE);
          } else {
            newH = STICKY_NOTE_MAX_HEIGHT;
            newY = rs.startPosY + (rs.startH - STICKY_NOTE_MAX_HEIGHT);
          }
        }

        newW = Math.max(MIN_SIZE, newW);
        newH = Math.max(MIN_SIZE, newH);

        setSize({ width: newW, height: newH });
        setPosition({ x: newX, y: newY });
      }

      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        listenersRef.current = null;
        resizeRef.current = null;
        setIsResizing(false);

        setSize((finalSize) => {
          const w = Math.round(finalSize.width);
          const h = Math.round(finalSize.height);
          setTimeout(() => onResizeRef.current(note.id, w, h), 0);
          return finalSize;
        });
        setPosition((finalPos) => {
          const x = Math.round(finalPos.x);
          const y = Math.round(finalPos.y);
          setTimeout(() => onDragStopRef.current(note.id, x, y), 0);
          return finalPos;
        });
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

  const edgeThickness = 6;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const noteColorKeys = Object.keys(NOTE_COLORS);

  function hasVisibleText(html?: string | null) {
    if (!html) return false;
    return stripHtmlForPlainText(html).trim().length > 0;
  }

  function hasFormattingMarkup(html?: string | null) {
    if (!html) return false;
    if (hasVisibleText(html)) return false;
    return /<(strong|b|em|i|u|s|mark|a|h[1-6]|blockquote|code|pre|ul|ol|li|span|font)[^>]*>/i.test(html);
  }

  function shouldConfirmDelete() {
    return (
      hasVisibleText(note.title) ||
      hasVisibleText(note.content) ||
      hasFormattingMarkup(note.title) ||
      hasFormattingMarkup(note.content)
    );
  }

  useEffect(() => {
    if (!requestDeleteConfirm) return;
    if (shouldConfirmDelete()) {
      setShowDeleteConfirm(true);
    } else {
      onDelete(note.id);
    }
    onDeleteConfirmHandled?.(note.id);
  }, [requestDeleteConfirm, note.id, note.title, note.content, onDeleteConfirmHandled, onDelete]);

  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLElement>}
      position={position}
      onStart={() => onDragStart?.(note.id)}
      onStop={handleDragStop}
      onDrag={(_e, data) => onDrag?.(note.id, data.x, data.y)}
      handle=".sticky-handle"
      cancel=".note-action-area, .note-action-btn, .note-options-menu"
      scale={zoom}
      disabled={isEditing || isResizing}
    >
      {/* Outer positioning wrapper – react-draggable applies translate here.
           Rotation lives on the inner div so translate and rotate don't interact. */}
      <div
        ref={nodeRef}
        data-board-item="note"
        data-note-id={note.id}
        className="absolute overflow-visible"
        style={{
          width: `${size.width}px`,
          minHeight: `${size.height}px`,
          zIndex,
        }}
        onMouseDown={() => onBringToFront?.(note.id)}
        onContextMenu={(e) => {
          const target = e.target as Element;
          const inEditable = target.closest('[contenteditable="true"]');
          const sel = window.getSelection();
          if (inEditable && sel?.isCollapsed) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(e);
        }}
      >
        <div
          className={[
            "relative flex min-h-0 flex-col overflow-visible rounded shadow-lg transition-[transform,box-shadow] duration-200 ease-out-smooth hover:-translate-y-0.5 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:transform-none",
            isEditing ? "cursor-default ring-2 ring-primary/40" : "cursor-pointer",
            focusedBy?.length ? "ring-[3px]" : "",
            color.bg,
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            ...(focusedBy?.length
              ? {
                  boxShadow: [
                    ...focusedBy.map((u, i) => `0 0 0 ${3 + i * 3}px ${u.color}`),
                    `0 0 12px 2px ${focusedBy[0]!.color}40`,
                  ].join(", "),
                }
              : {}),
            width: "100%",
            minHeight: `${size.height}px`,
            transformOrigin: "center center",
            transform: [
              enlargeWhenEditing && isEditing ? "scale(1.25)" : "scale(1)",
              `rotate(${isEditing ? 0 : note.rotation ?? 0}deg)`,
            ].join(" "),
          }}
          onClick={(e) => {
            // Ignore click if it follows a drag (drag release fires click, which would open edit)
            if (Date.now() - lastDragEndRef.current < 300) return;
            if (!isEditing) {
              const target = e.target as HTMLElement;
              const titleEl = target.closest("[data-field='title']") as HTMLElement | null;
              const contentEl = target.closest("[data-field='content']") as HTMLElement | null;

              if (titleEl) {
                const rect = titleEl.getBoundingClientRect();
                const yRatio = rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0;
                pendingClickRef.current = { field: "title", yRatio: Math.max(0, Math.min(1, yRatio)) };
              } else if (contentEl) {
                const rect = contentEl.getBoundingClientRect();
                const yRatio = rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0;
                pendingClickRef.current = { field: "content", yRatio: Math.max(0, Math.min(1, yRatio)) };
              } else {
                // Clicked outside title/content - focus content at end
                pendingClickRef.current = { field: "content", yRatio: 1 };
              }
              onStartEdit(note.id);
            }
          }}
        >
        {/* Pin – interactive for red-string linking */}
        <div
          data-pin-note-id={note.id}
          className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 group/pin"
          onMouseDown={(e) => {
            if (!onPinMouseDown) return;
            e.stopPropagation();
            e.preventDefault();
            onPinMouseDown(note.id);
          }}
        >
          {/* Larger invisible hit-area */}
          <div className="absolute -inset-2" />
          <div className="relative">
            {isLinking && (
              <span className="absolute inset-0 rounded-full animate-ripple-out motion-reduce:hidden" style={{ background: "rgb(248 113 113 / 0.5)" }} />
            )}
            <div
              className={[
                "relative h-4 w-4 rounded-full shadow-md border-2 border-white/60 transition-[transform] duration-150 ease-out-smooth motion-reduce:transition-none",
                color.pin,
                onPinMouseDown ? "cursor-pointer group-hover/pin:scale-150" : "",
                isLinking ? "group-hover/pin:scale-150 group-hover/pin:ring-2 group-hover/pin:ring-red-400" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          </div>
        </div>

        {/* Drag handle + more menu + delete */}
        <div
          className="sticky-handle flex cursor-grab items-center justify-between px-3 pt-4 pb-1 active:cursor-grabbing"
          onClick={() => {
            if (isEditing && onExitEdit) onExitEdit(note.id);
          }}
        >
          <GripVertical className="h-3.5 w-3.5 text-black/20" />
          <div
            className="note-action-area relative flex items-center gap-0.5"
            ref={menuRef}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="note-action-btn touch-manipulation rounded p-0.5 text-black/30 transition-colors hover:bg-black/10 hover:text-black/60"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((open) => !open);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Note options"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div
                className="note-options-menu absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Color
                </div>
                <div className="flex flex-nowrap items-center gap-1 px-2 pb-2">
                  {noteColorKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onColorChange(note.id, key);
                        setMenuOpen(false);
                      }}
                      className={`h-6 w-6 shrink-0 rounded-full border-2 transition-transform hover:scale-110 ${
                        colorKey === key
                          ? "border-gray-700 dark:border-gray-300"
                          : "border-transparent"
                      } ${NOTE_COLORS[key].bg}`}
                      title={key}
                      aria-label={`Color ${key}`}
                    />
                  ))}
                </div>
                <div className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <RotateCw className="h-3 w-3" />
                  Tilt
                </div>
                <div className="flex flex-wrap items-center gap-1 px-2 pb-2">
                  {ROTATION_PRESETS.map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => {
                        onRotationChange(note.id, deg);
                        setMenuOpen(false);
                      }}
                      className={[
                        "flex h-6 min-w-[28px] items-center justify-center rounded border px-1 text-[10px] font-medium transition-colors",
                        (note.rotation ?? 0) === deg
                          ? "border-gray-800 bg-black/10 text-gray-900 dark:border-gray-300 dark:bg-white/10 dark:text-gray-100"
                          : "border-gray-200 bg-white/80 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700/80 dark:text-gray-300 dark:hover:bg-gray-600",
                      ].join(" ")}
                      title={`${deg}°`}
                    >
                      {deg === 0 ? "0°" : `${deg > 0 ? "+" : ""}${deg}°`}
                    </button>
                  ))}
                </div>
                <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                {onDuplicate && (
                  <button
                    type="button"
                    onClick={() => {
                      onDuplicate(note.id);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Duplicate note
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (shouldConfirmDelete()) {
                      setShowDeleteConfirm(true);
                    } else {
                      onDelete(note.id);
                    }
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete note
                </button>
              </div>
            )}
            <button
              type="button"
              className="note-action-btn touch-manipulation rounded p-0.5 text-black/30 transition-colors hover:bg-black/10 hover:text-black/60"
              onClick={(e) => {
                e.stopPropagation();
                if (shouldConfirmDelete()) {
                  setShowDeleteConfirm(true);
                } else {
                  onDelete(note.id);
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Delete note"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Body: full-width editors (toolbar is absolutely positioned to the left) */}
        <div className="min-w-0 flex-1 overflow-hidden">
          {isEditing || (focusedBy && focusedBy.length > 0) ? (
            <div className="px-3 pb-4 space-y-1.5" onBlur={handleBlur} onKeyDown={handleKeyDown}>
              {/* Title rich text editor */}
              <div ref={titleEditorWrapperRef} className="tiptap-editor-area tiptap-title-area relative !overflow-visible">
                <EditorContent editor={titleEditor} />
                {remoteTextCursors
                  .filter((r) => r.field === "title")
                  .map((r) => (
                    <RemoteCaret
                      key={r.userId}
                      editor={titleEditor}
                      position={r.position}
                      color={r.color}
                      wrapperRef={titleEditorWrapperRef}
                    />
                  ))}
              </div>
              <div className="flex justify-end -mt-0.5 mb-0.5">
                <span
                  className={`text-[10px] ${
                    (titleCharCount ?? 0) >= MAX_TITLE_TEXT_LENGTH
                      ? "text-red-600 font-semibold"
                      : "text-gray-500/60"
                  }`}
                >
                  {titleCharCount ?? 0}/{MAX_TITLE_TEXT_LENGTH}
                </span>
              </div>

              {/* Content rich text editor */}
              <div
                ref={contentEditorWrapperRef}
                className="tiptap-editor-area relative !overflow-visible"
                style={{ minHeight: `${Math.max(60, size.height - 120)}px` }}
              >
                <EditorContent editor={contentEditor} />
                {remoteTextCursors
                  .filter((r) => r.field === "content")
                  .map((r) => (
                    <RemoteCaret
                      key={r.userId}
                      editor={contentEditor}
                      position={r.position}
                      color={r.color}
                      wrapperRef={contentEditorWrapperRef}
                    />
                  ))}
              </div>

              <div className="flex justify-end">
                <span
                  className={`text-[10px] ${
                    (contentCharCount ?? 0) >= MAX_CONTENT_TEXT_LENGTH
                      ? "text-red-600 font-semibold"
                      : "text-gray-500/60"
                  }`}
                >
                  {contentCharCount ?? 0}/{MAX_CONTENT_TEXT_LENGTH}
                </span>
              </div>
            </div>
          ) : (
            <div
              ref={contentRef}
              className="px-3 pb-4"
            >
              {note.title ? (
                <div
                  data-field="title"
                  className="note-rich-content mb-1 break-words text-sm font-semibold text-gray-800"
                  dangerouslySetInnerHTML={{ __html: note.title }}
                />
              ) : (
                <p data-field="title" className="mb-1 text-sm font-semibold text-gray-500/50">Untitled</p>
              )}
              {note.content && (
                <div
                  data-field="content"
                  className="note-rich-content break-words text-xs text-gray-600"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
              )}
              {note.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-block rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-700"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Edge resize handles */}
        <div
          className={`absolute left-2 right-2 top-0 ${CURSOR_MAP.n}`}
          style={{ height: edgeThickness }}
          onMouseDown={startResize("n")}
        />
        <div
          className={`absolute left-2 right-2 bottom-0 ${CURSOR_MAP.s}`}
          style={{ height: edgeThickness }}
          onMouseDown={startResize("s")}
        />
        <div
          className={`absolute top-2 bottom-2 left-0 ${CURSOR_MAP.w}`}
          style={{ width: edgeThickness }}
          onMouseDown={startResize("w")}
        />
        <div
          className={`absolute top-2 bottom-2 right-0 ${CURSOR_MAP.e}`}
          style={{ width: edgeThickness }}
          onMouseDown={startResize("e")}
        />

        {/* Corner resize handles */}
        <div
          className={`absolute top-0 left-0 h-3 w-3 ${CURSOR_MAP.nw}`}
          onMouseDown={startResize("nw")}
        />
        <div
          className={`absolute top-0 right-0 h-3 w-3 ${CURSOR_MAP.ne}`}
          onMouseDown={startResize("ne")}
        />
        <div
          className={`absolute bottom-0 left-0 h-3 w-3 ${CURSOR_MAP.sw}`}
          onMouseDown={startResize("sw")}
        />
        <div
          className={`absolute bottom-0 right-0 h-3 w-3 ${CURSOR_MAP.se}`}
          onMouseDown={startResize("se")}
        />

        {/* Delete confirmation overlay */}
        {showDeleteConfirm && (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center rounded bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-4 rounded-lg bg-white p-4 shadow-xl">
              <p className="mb-3 text-sm font-medium text-gray-800">
                Delete this note?
              </p>
              <p className="mb-4 text-xs text-gray-500">
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                  }}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                    onDelete(note.id);
                  }}
                  className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        </div>{/* end inner rotated div */}
      </div>{/* end outer positioning div */}
    </Draggable>
  );
}
