import { useEffect, useRef, useState, useCallback } from "react";
import Draggable, { type DraggableEventHandler } from "react-draggable";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import CharacterCount from "@tiptap/extension-character-count";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { X, GripVertical, MoreVertical, Copy, Trash2, RotateCw } from "lucide-react";
import { handleTabKey } from "../../lib/tiptap-tab-indent";
import type { IndexCardSummaryDto } from "../../types";
import { FontSize } from "../../lib/tiptap-font-size";
import { INDEX_CARD_COLORS } from "./indexCardColors";
import type { BoardRichTextToolbarState } from "./BoardMenuBar";
import { ROTATION_PRESETS } from "./noteToolbarConstants";

/** More visible swatch colors for the dropdown (actual card uses pastel INDEX_CARD_COLORS) */
const INDEX_CARD_SWATCH: Record<string, string> = {
  white: "bg-gray-100 dark:bg-gray-300",
  ivory: "bg-amber-200 dark:bg-amber-400",
  sky: "bg-sky-200 dark:bg-sky-400",
  rose: "bg-rose-200 dark:bg-rose-400",
  mint: "bg-emerald-200 dark:bg-emerald-400",
  lavender: "bg-violet-200 dark:bg-violet-400",
};

interface IndexCardProps {
  card: IndexCardSummaryDto;
  isEditing: boolean;
  zIndex?: number;
  onDragStop: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  /** Optional: duplicate this card (e.g. create a copy on the board) */
  onDuplicate?: (id: string) => void;
  onStartEdit: (id: string) => void;
  onSave: (id: string, title: string, content: string) => void;
  /** Optional: called on debounced content/title change while editing (for real-time sync). If not provided, debounced save is skipped. */
  onContentChange?: (id: string, title: string, content: string) => void;
  onResize: (id: string, width: number, height: number) => void;
  onColorChange: (id: string, color: string) => void;
  onRotationChange: (id: string, rotation: number) => void;
  onPinMouseDown?: (cardId: string) => void;
  onDrag?: (id: string, x: number, y: number) => void;
  onDragStart?: (id: string) => void;
  onBringToFront?: (id: string) => void;
  /** True when any item on the board is being linked (used for pin hover styling) */
  isLinking?: boolean;
  /** When other user(s) are focusing this card, show a border in their color(s). Multiple users can edit at once. */
  focusedBy?: { userId: string; color: string }[] | null;
  /** Called when user clicks the drag handle while editing (to exit edit mode) */
  onExitEdit?: (id: string) => void;
  /** Called when user right-clicks the card (for context menu). Call e.preventDefault() and e.stopPropagation() before showing menu. */
  onContextMenu?: (e: React.MouseEvent) => void;
  zoom?: number;
  /** When true, visually scale the card when editing (for better readability) */
  enlargeWhenEditing?: boolean;
  onRichTextToolbarChange?: (state: BoardRichTextToolbarState | null, clearedSourceId?: string) => void;
}

const DEFAULT_WIDTH = 450;
const DEFAULT_HEIGHT = 300;
const MIN_WIDTH = 200;
const MIN_HEIGHT = 160;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;
const MAX_CONTENT_LENGTH = 10000;
const MAX_TITLE_LENGTH = 100;

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

function resolveCardColorKey(card: IndexCardSummaryDto): string {
  const colors = INDEX_CARD_COLORS ?? {};
  if (card.color && colors[card.color]) return card.color;
  let hash = 0;
  for (let i = 0; i < card.id.length; i++) {
    hash = card.id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const keys = Object.keys(colors);
  return keys[Math.abs(hash) % keys.length] ?? "white";
}

export function IndexCard({
  card,
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
  onExitEdit,
  onContextMenu,
  zoom = 1,
  enlargeWhenEditing = false,
  onRichTextToolbarChange,
}: IndexCardProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const lastDragEndRef = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const colorKey = resolveCardColorKey(card);
  const color = INDEX_CARD_COLORS[colorKey];

  const [activeField, setActiveField] = useState<"title" | "content">("title");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({
    width: card.width ?? DEFAULT_WIDTH,
    height: card.height ?? DEFAULT_HEIGHT,
  });
  const [position, setPosition] = useState({
    x: card.positionX ?? 20,
    y: card.positionY ?? 20,
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
  ];

  const titleEditor = useEditor({
    extensions: [
      ...sharedExtensions,
      CharacterCount.configure({ limit: MAX_TITLE_LENGTH }),
    ],
    content: card.title || "",
    editable: isEditing,
    editorProps: {
      attributes: {
        class:
          "prose-none w-full bg-transparent text-sm font-semibold text-gray-800 focus:outline-none break-words",
      },
      handleKeyDown: handleTabKey,
    },
    onFocus: () => setActiveField("title"),
  });

  const contentEditor = useEditor({
    extensions: [
      ...sharedExtensions,
      CharacterCount.configure({ limit: MAX_CONTENT_LENGTH }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: card.content || "",
    editable: isEditing,
    editorProps: {
      attributes: {
        class:
          "prose-none w-full bg-transparent text-xs text-gray-700 focus:outline-none min-h-[60px] break-words",
      },
      handleKeyDown: handleTabKey,
    },
    onFocus: () => setActiveField("content"),
  });

  const activeEditor =
    activeField === "title" ? titleEditor : contentEditor;

  // Toggle editable when isEditing changes
  useEffect(() => {
    titleEditor?.setEditable(isEditing);
    contentEditor?.setEditable(isEditing);
  }, [titleEditor, contentEditor, isEditing]);

  // Sync title editor from props
  useEffect(() => {
    if (!titleEditor) return;
    const currentHtml = titleEditor.getHTML();
    const propHtml = card.title ?? "";
    if (currentHtml !== propHtml && propHtml !== undefined) {
      // When not editing, only sync if editor is not focused
      // When editing, always sync to show remote changes (collaborative live editing)
      if (!isEditing) {
        if (!titleEditor.isFocused) {
          titleEditor.commands.setContent(propHtml || "", { emitUpdate: false });
        }
      } else {
        titleEditor.commands.setContent(propHtml || "", { emitUpdate: false });
      }
    }
  }, [card.title, isEditing, titleEditor]);

  // Sync content editor from props
  useEffect(() => {
    if (!contentEditor) return;
    const currentHtml = contentEditor.getHTML();
    const propHtml = card.content ?? "";
    if (currentHtml !== propHtml && propHtml !== undefined) {
      // When not editing, only sync if editor is not focused
      // When editing, always sync to show remote changes (collaborative live editing)
      if (!isEditing) {
        if (!contentEditor.isFocused) {
          contentEditor.commands.setContent(propHtml || "", { emitUpdate: false });
        }
      } else {
        contentEditor.commands.setContent(propHtml || "", { emitUpdate: false });
      }
    }
  }, [card.content, isEditing, contentEditor]);

  // Debounced content push while typing so other clients see updates in real time (only when onContentChange provided)
  const SAVE_DEBOUNCE_MS = 200;
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;
  useEffect(() => {
    if (!onContentChangeRef.current || !isEditing || !titleEditor || !contentEditor) return;
    const flush = () => {
      onContentChangeRef.current?.(card.id, titleEditor.getHTML(), contentEditor.getHTML());
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
    };
  }, [isEditing, card.id, titleEditor, contentEditor]);

  // Keep stable refs for parent callbacks so resize handlers never go stale
  const onResizeRef = useRef(onResize);
  const onDragStopRef = useRef(onDragStop);
  onResizeRef.current = onResize;
  onDragStopRef.current = onDragStop;

  // Sync size from props only when card prop values actually change and not resizing
  useEffect(() => {
    if (isResizing) return;
    const w = card.width ?? DEFAULT_WIDTH;
    const h = card.height ?? DEFAULT_HEIGHT;
    setSize((prev) => {
      if (prev.width === w && prev.height === h) return prev;
      return { width: w, height: h };
    });
  }, [card.width, card.height, isResizing]);

  // Sync position from props only when card prop values actually change and not resizing
  useEffect(() => {
    if (isResizing) return;
    const x = card.positionX ?? 20;
    const y = card.positionY ?? 20;
    setPosition((prev) => {
      if (prev.x === x && prev.y === y) return prev;
      return { x, y };
    });
  }, [card.positionX, card.positionY, isResizing]);

  // Track which field was clicked and the vertical ratio within it
  const pendingClickRef = useRef<{
    field: "title" | "content";
    yRatio: number;
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

    requestAnimationFrame(() => {
      const editorEl = editor.view.dom;
      const rect = editorEl.getBoundingClientRect();
      const targetY = rect.top + click.yRatio * rect.height;
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
      const totalNeeded = contentHeight + 60; // extra room for header band
      const currentHeight = card.height ?? DEFAULT_HEIGHT;
      if (totalNeeded > currentHeight) {
        const parent = nodeRef.current?.parentElement;
        const boardH = parent?.clientHeight ?? 9999;
        const maxAvailable = boardH - (card.positionY ?? 20);
        const clampedHeight = Math.min(totalNeeded, maxAvailable);
        setSize((prev) => {
          if (prev.height >= clampedHeight) return prev;
          return { ...prev, height: clampedHeight };
        });
      }
    }
  }, [card.content, card.title, card.tags, isEditing, card.height, card.positionY, isResizing]);

  const handleDragStop: DraggableEventHandler = (_e, data) => {
    setPosition({ x: data.x, y: data.y });
    lastDragEndRef.current = Date.now();
    onDragStop(card.id, data.x, data.y);
  };

  // Do not close edit mode on blur (e.g. tab switch). Close only when user clicks another card or board.
  const handleBlur = useCallback(() => {
    // No-op: keep edit mode on; parent will remove from editingCardIds on board click or other-card click
  }, []);

  // When parent removes this card from editing (isEditing -> false), save current content once
  const wasEditingRef = useRef(false);
  useEffect(() => {
    if (wasEditingRef.current && !isEditing && titleEditor && contentEditor) {
      const titleHtml = titleEditor.getHTML();
      const contentHtml = contentEditor.getHTML();
      onSave(card.id, titleHtml, contentHtml);
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, titleEditor, contentEditor, card.id, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && titleEditor && contentEditor) {
        const titleHtml = titleEditor.getHTML();
        const contentHtml = contentEditor.getHTML();
        onSave(card.id, titleHtml, contentHtml);
      }
    },
    [titleEditor, contentEditor, card.id, onSave],
  );

  useEffect(() => {
    if (!onRichTextToolbarChange) return;
    if (!isEditing) {
      onRichTextToolbarChange(null, card.id);
      return;
    }
    onRichTextToolbarChange({
      sourceId: card.id,
      editor: activeEditor,
    });
  }, [isEditing, activeEditor, activeField, titleEditor, contentEditor, card.id, onRichTextToolbarChange]);

  useEffect(() => {
    return () => {
      onRichTextToolbarChange?.(null, card.id);
    };
  }, [onRichTextToolbarChange, card.id]);

  // --- Resize logic ---
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
          newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, rs.startW + dx));
        }
        if (rs.dir === "w" || rs.dir === "nw" || rs.dir === "sw") {
          const proposed = rs.startW - dx;
          if (proposed >= MIN_WIDTH && proposed <= MAX_WIDTH) {
            newW = proposed;
            newX = rs.startPosX + dx;
          } else if (proposed < MIN_WIDTH) {
            newW = MIN_WIDTH;
            newX = rs.startPosX + (rs.startW - MIN_WIDTH);
          } else {
            newW = MAX_WIDTH;
            newX = rs.startPosX + (rs.startW - MAX_WIDTH);
          }
        }
        if (rs.dir === "s" || rs.dir === "se" || rs.dir === "sw") {
          newH = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, rs.startH + dy));
        }
        if (rs.dir === "n" || rs.dir === "ne" || rs.dir === "nw") {
          const proposed = rs.startH - dy;
          if (proposed >= MIN_HEIGHT && proposed <= MAX_HEIGHT) {
            newH = proposed;
            newY = rs.startPosY + dy;
          } else if (proposed < MIN_HEIGHT) {
            newH = MIN_HEIGHT;
            newY = rs.startPosY + (rs.startH - MIN_HEIGHT);
          } else {
            newH = MAX_HEIGHT;
            newY = rs.startPosY + (rs.startH - MAX_HEIGHT);
          }
        }

        newW = Math.max(MIN_WIDTH, newW);
        newH = Math.max(MIN_HEIGHT, newH);

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
          setTimeout(() => onResizeRef.current(card.id, w, h), 0);
          return finalSize;
        });
        setPosition((finalPos) => {
          const x = Math.round(finalPos.x);
          const y = Math.round(finalPos.y);
          setTimeout(() => onDragStopRef.current(card.id, x, y), 0);
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

  const cardColorKeys = Object.keys(INDEX_CARD_COLORS);

  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLElement>}
      position={position}
      onStart={() => onDragStart?.(card.id)}
      onStop={handleDragStop}
      onDrag={(_e, data) => onDrag?.(card.id, data.x, data.y)}
      handle=".index-card-handle"
      scale={zoom}
      disabled={isEditing || isResizing}
    >
      {/* Outer positioning wrapper */}
      <div
        ref={nodeRef}
        data-board-item="card"
        data-card-id={card.id}
        className="absolute overflow-visible"
        style={{
          width: `${size.width}px`,
          minHeight: `${size.height}px`,
          zIndex,
        }}
        onMouseDown={() => onBringToFront?.(card.id)}
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
            "index-card relative flex min-h-0 flex-col overflow-visible rounded-md shadow-lg transition-shadow hover:shadow-xl",
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
              `rotate(${isEditing ? 0 : card.rotation ?? 0}deg)`,
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
                pendingClickRef.current = { field: "content", yRatio: 1 };
              }
              onStartEdit(card.id);
            }
          }}
          >
          {/* Pin */}
          <div
            data-pin-note-id={card.id}
            className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 group/pin"
            onMouseDown={(e) => {
              if (!onPinMouseDown) return;
              e.stopPropagation();
              e.preventDefault();
              onPinMouseDown(card.id);
            }}
          >
            <div className="absolute -inset-2" />
            <div
              className={[
                "h-4 w-4 rounded-full shadow-md border-2 border-white/60 transition-transform duration-150",
                color.pin,
                onPinMouseDown ? "cursor-pointer group-hover/pin:scale-150" : "",
                isLinking ? "animate-pulse group-hover/pin:scale-150 group-hover/pin:ring-2 group-hover/pin:ring-red-400" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          </div>

          {/* Header band with drag handle + more menu + delete + red rule line */}
          <div className={`rounded-t-md ${color.headerBg}`}>
            <div
              className="index-card-handle flex cursor-grab items-center justify-between px-3 pt-4 pb-1 active:cursor-grabbing"
              onClick={() => {
                if (isEditing && onExitEdit) onExitEdit(card.id);
              }}
            >
              <GripVertical className="h-3.5 w-3.5 text-black/20" />
              <div className="relative flex items-center gap-0.5" ref={menuRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((open) => !open);
                  }}
                  className="rounded p-0.5 text-black/30 transition-colors hover:bg-black/10 hover:text-black/60"
                  aria-label="Index card options"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                      Color
                    </div>
                    <div className="flex flex-nowrap items-center gap-1.5 px-2 pb-2">
                      {cardColorKeys.map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            onColorChange(card.id, key);
                            setMenuOpen(false);
                          }}
                          className={`h-6 w-6 shrink-0 rounded-full border-2 transition-transform hover:scale-110 ${
                            colorKey === key
                              ? "border-gray-700 ring-2 ring-gray-400 ring-offset-1 dark:border-gray-300 dark:ring-gray-500"
                              : "border-gray-300 dark:border-gray-500"
                          } ${INDEX_CARD_SWATCH[key] ?? INDEX_CARD_COLORS[key].bg}`}
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
                            onRotationChange(card.id, deg);
                            setMenuOpen(false);
                          }}
                          className={[
                            "flex h-6 min-w-[28px] items-center justify-center rounded border px-1 text-[10px] font-medium transition-colors",
                            (card.rotation ?? 0) === deg
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
                          onDuplicate(card.id);
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Duplicate card
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        const stripHtml = (html: string) =>
                          html.replace(/<[^>]*>/g, "").trim();
                        const hasContent =
                          !!(card.content && stripHtml(card.content).length > 0);
                        if (hasContent) {
                          setShowDeleteConfirm(true);
                        } else {
                          onDelete(card.id);
                        }
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete card
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const stripHtml = (html: string) =>
                      html.replace(/<[^>]*>/g, "").trim();
                    const hasContent =
                      !!(card.content && stripHtml(card.content).length > 0);
                    if (hasContent) {
                      setShowDeleteConfirm(true);
                    } else {
                      onDelete(card.id);
                    }
                  }}
                  className="rounded p-0.5 text-black/30 transition-colors hover:bg-black/10 hover:text-black/60"
                  aria-label="Delete index card"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Title area inside header */}
            {isEditing ? (
              <div className="px-3 pb-1" onBlur={handleBlur} onKeyDown={handleKeyDown}>
                <div className="tiptap-editor-area tiptap-title-area">
                  <EditorContent editor={titleEditor} />
                </div>
                <div className="flex justify-end -mt-0.5 mb-0.5">
                  <span
                    className={`text-[10px] ${
                      (titleEditor?.storage.characterCount?.characters() ?? 0) >=
                      MAX_TITLE_LENGTH
                        ? "text-red-600 font-semibold"
                        : "text-gray-500/60"
                    }`}
                  >
                    {titleEditor?.storage.characterCount?.characters() ?? 0}/{MAX_TITLE_LENGTH}
                  </span>
                </div>
              </div>
            ) : (
              <div className="px-3 pb-1">
                {card.title ? (
                  <div
                    data-field="title"
                    className="note-rich-content break-words text-sm font-semibold text-gray-800"
                    dangerouslySetInnerHTML={{ __html: card.title }}
                  />
                ) : (
                  <p data-field="title" className="text-sm font-semibold text-gray-500/50">Untitled</p>
                )}
              </div>
            )}

            {/* Red rule line */}
            <div className="index-card-header-rule" />
          </div>

          {/* Content area with ruled lines (toolbar is absolutely positioned to the left) */}
          <div className="index-card-ruled min-w-0 flex-1 overflow-hidden">
            {isEditing ? (
              <div className="px-3 pb-4 pt-2 space-y-1.5" onBlur={handleBlur} onKeyDown={handleKeyDown}>
                <div
                  className="tiptap-editor-area index-card-content"
                  style={{ minHeight: `${Math.max(80, size.height - 160)}px` }}
                >
                  <EditorContent editor={contentEditor} />
                </div>

                <div className="flex justify-end">
                  <span
                    className={`text-[10px] ${
                      (contentEditor?.storage.characterCount?.characters() ?? 0) >=
                      MAX_CONTENT_LENGTH
                        ? "text-red-600 font-semibold"
                        : "text-gray-500/60"
                    }`}
                  >
                    {contentEditor?.storage.characterCount?.characters() ?? 0}/{MAX_CONTENT_LENGTH}
                  </span>
                </div>
              </div>
            ) : (
              <div
                ref={contentRef}
                className="px-3 pb-4 pt-2"
              >
                {card.content && (
                  <div
                    data-field="content"
                    className="note-rich-content index-card-content break-words text-xs text-gray-600"
                    dangerouslySetInnerHTML={{ __html: card.content }}
                  />
                )}
                {card.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {card.tags.slice(0, 3).map((tag) => (
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
              className="absolute inset-0 z-30 flex items-center justify-center rounded-md bg-black/40 backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-4 rounded-lg bg-white p-4 shadow-xl">
                <p className="mb-3 text-sm font-medium text-gray-800">
                  Delete this index card?
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
                      onDelete(card.id);
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
