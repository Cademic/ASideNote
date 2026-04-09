import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Highlighter,
  Italic,
  Underline,
  Strikethrough,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  List,
  ChevronDown,
  ListOrdered,
} from "lucide-react";
import {
  HIGHLIGHT_COLORS,
  hexForColorInput,
  TEXT_COLORS,
} from "./noteToolbarConstants";
import { FontFamilySearch } from "./FontFamilySearch";
import { FontSizeSearch } from "./FontSizeSearch";
import { fitFixedDropdownToViewport, nudgeAbsoluteElementIntoViewport } from "../../lib/dropdown-viewport";

interface NoteToolbarProps {
  editor: Editor | null;
  /** Horizontal bar (default) or narrow vertical strip for left-docked toolbars */
  variant?: "horizontal" | "vertical";
  /** Optional horizontal segmentation for compact carousel layouts */
  segment?: "all" | "primary" | "secondary";
}

function ToolbarButton({
  isActive,
  onClick,
  title,
  children,
}: {
  isActive?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={[
        "flex h-6 w-6 items-center justify-center rounded transition-colors",
        isActive
          ? "bg-sky-100 text-sky-800 ring-1 ring-sky-300/50 dark:bg-sky-900/40 dark:text-sky-200 dark:ring-sky-500/30"
          : "text-gray-600 hover:bg-black/10 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ListDropdownButton({
  editor,
  dropdownPlacement = "below",
}: {
  editor: Editor;
  dropdownPlacement?: "below" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) {
      setDropdownStyle(null);
      return;
    }
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    if (dropdownPlacement === "right") {
      setDropdownStyle({ left: rect.right + 4, top: rect.top });
    } else {
      setDropdownStyle({ left: rect.left, top: rect.bottom + 4 });
    }
  }, [open, dropdownPlacement]);

  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current;
    const fit = () => fitFixedDropdownToViewport(el, setDropdownStyle);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, dropdownStyle]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      if (dropdownPlacement === "right") {
        setDropdownStyle({ left: rect.right + 4, top: rect.top });
      } else {
        setDropdownStyle({ left: rect.left, top: rect.bottom + 4 });
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, dropdownPlacement]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if ((target as Element).closest?.("[data-board-toolbar-portal]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [open]);

  const isBullet = editor.isActive("bulletList");
  const isOrdered = editor.isActive("orderedList");
  const orderedType = editor.getAttributes("orderedList").type;
  const isABC = orderedType === "A" || orderedType === "a";
  const isNumbered = isOrdered && !isABC;

  const listOptions = [
    {
      label: "Bullet points",
      icon: List,
      active: isBullet,
      onClick: () => {
        editor.chain().focus().toggleBulletList().run();
        setOpen(false);
      },
    },
    {
      label: "Number points",
      icon: ListOrdered,
      active: isNumbered,
      onClick: () => {
        if (isOrdered) {
          editor.chain().focus().updateAttributes("orderedList", { type: null }).run();
        } else {
          editor.chain().focus().toggleOrderedList().run();
        }
        setOpen(false);
      },
    },
    {
      label: "ABC points",
      icon: ListOrdered,
      active: isABC,
      onClick: () => {
        if (isOrdered) {
          editor.chain().focus().updateAttributes("orderedList", { type: "A" }).run();
        } else {
          editor.chain().focus().toggleOrderedList().updateAttributes("orderedList", { type: "A" }).run();
        }
        setOpen(false);
      },
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) {
            setOpen(false);
          } else {
            setOpen(true);
          }
        }}
        title="Lists"
        className={[
          "flex h-6 items-center gap-0.5 rounded px-1.5 transition-colors",
          isBullet || isOrdered
            ? "bg-sky-100 text-sky-800 ring-1 ring-sky-300/50 dark:bg-sky-900/40 dark:text-sky-200 dark:ring-sky-500/30"
            : "text-gray-600 hover:bg-black/10 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200",
        ].join(" ")}
      >
        <List className="h-3.5 w-3.5" />
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && dropdownStyle &&
        createPortal(
          <div
            ref={panelRef}
            data-board-toolbar-portal
            className="fixed z-[99999] min-w-[160px] max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-600 dark:bg-gray-800"
            style={{ left: dropdownStyle.left, top: dropdownStyle.top }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {listOptions.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                opt.onClick();
              }}
              className={[
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
                opt.active
                  ? "bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
              ].join(" ")}
            >
              <opt.icon className="h-3.5 w-3.5 shrink-0" />
              {opt.label}
            </button>
          ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

function LinkButton({ editor, isLinkActive }: { editor: Editor; isLinkActive: boolean }) {
  const [showInput, setShowInput] = useState(false);
  const [url, setUrl] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const linkPopupRef = useRef<HTMLDivElement>(null);
  const isLink = isLinkActive;

  useLayoutEffect(() => {
    if (!showInput || !linkPopupRef.current) return;
    nudgeAbsoluteElementIntoViewport(linkPopupRef.current);
  }, [showInput]);

  function handleSetLink() {
    if (url.trim()) {
      editor.chain().focus().setLink({ href: url.trim() }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setUrl("");
    setShowInput(false);
  }

  const noteEl =
    showInput && wrapperRef.current
      ? (wrapperRef.current.closest(
          '[data-board-item="note"], [data-board-item="card"]',
        ) as HTMLElement | null)
      : null;

  const popupContent = showInput && (
    <div
      ref={linkPopupRef}
      className="absolute left-1/2 top-1/2 z-50 flex w-[calc(100%-40px)] max-w-[min(320px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-600 dark:bg-gray-800"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSetLink();
          if (e.key === "Escape") {
            setShowInput(false);
            setUrl("");
          }
        }}
        placeholder="Enter URL"
        autoFocus
        className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
      />
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          handleSetLink();
        }}
        className="shrink-0 rounded bg-sky-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
      >
        Set
      </button>
    </div>
  );

  return (
    <div ref={wrapperRef} className="relative">
      <ToolbarButton
        isActive={isLink}
        onClick={() => {
          if (isLink) {
            editor.chain().focus().unsetLink().run();
          } else {
            setUrl(editor.getAttributes("link").href || "https://");
            setShowInput(true);
          }
        }}
        title="Link / Unlink"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      {noteEl && popupContent && createPortal(popupContent, noteEl)}
      {showInput && !noteEl && (
        <div
          ref={linkPopupRef}
          className="absolute left-1/2 top-full z-50 mt-1 flex w-64 max-w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-600 dark:bg-gray-800"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSetLink();
              if (e.key === "Escape") {
                setShowInput(false);
                setUrl("");
              }
            }}
            placeholder="Enter URL"
            autoFocus
            className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSetLink();
            }}
            className="shrink-0 rounded bg-sky-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
          >
            Set
          </button>
        </div>
      )}
    </div>
  );
}

export function TextColorDropdown({
  editor,
  currentColor,
  dropdownPlacement,
}: {
  editor: Editor;
  currentColor: string;
  dropdownPlacement: "below" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [pickerValue, setPickerValue] = useState(() => hexForColorInput(currentColor));

  useLayoutEffect(() => {
    if (!open) {
      setDropdownStyle(null);
      return;
    }
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    if (dropdownPlacement === "right") {
      setDropdownStyle({ left: rect.right + 4, top: rect.top });
    } else {
      setDropdownStyle({ left: rect.left, top: rect.bottom + 4 });
    }
  }, [open, dropdownPlacement]);

  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current;
    const fit = () => fitFixedDropdownToViewport(el, setDropdownStyle);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, dropdownStyle]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      if (dropdownPlacement === "right") {
        setDropdownStyle({ left: rect.right + 4, top: rect.top });
      } else {
        setDropdownStyle({ left: rect.left, top: rect.bottom + 4 });
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, dropdownPlacement]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if ((target as Element).closest?.("[data-board-toolbar-portal]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [open]);

  useEffect(() => {
    if (open) setPickerValue(hexForColorInput(currentColor));
  }, [open, currentColor]);

  const panel =
    open &&
    dropdownStyle &&
    createPortal(
      <div
        ref={panelRef}
        data-board-toolbar-portal
        className="fixed z-[99999] min-w-[200px] max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white py-1.5 shadow-xl dark:border-gray-600 dark:bg-gray-800"
        style={{ left: dropdownStyle.left, top: dropdownStyle.top }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Text color
        </p>
        <div className="flex flex-wrap gap-1.5 px-2.5">
          {TEXT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().setColor(c.value).run();
                setOpen(false);
              }}
              title={c.label}
              className={[
                "h-7 w-7 rounded-full border transition-transform",
                currentColor === c.value
                  ? "scale-105 border-gray-800 ring-2 ring-sky-400/80"
                  : "border-black/20 hover:scale-105",
              ].join(" ")}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
        <div className="mt-2 border-t border-black/10 px-2.5 pt-2 dark:border-white/10">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              colorInputRef.current?.click();
            }}
            className="w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-left text-xs text-gray-800 hover:bg-gray-50 dark:border-white/15 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            Custom color…
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={pickerValue}
            onChange={(e) => {
              const v = e.target.value;
              setPickerValue(v);
              editor.chain().focus().setColor(v).run();
              setOpen(false);
            }}
            className="pointer-events-none fixed h-px w-px opacity-0"
            tabIndex={-1}
            aria-hidden
          />
        </div>
      </div>,
      document.body,
    );

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) {
            setOpen(false);
          } else {
            setOpen(true);
          }
        }}
        title="Text color"
        className={[
          "flex h-6 items-center gap-1 rounded border border-black/15 bg-white/60 px-1.5 transition-colors dark:bg-gray-800/60 dark:border-white/15",
          open ? "ring-1 ring-sky-400/60" : "hover:bg-black/5 dark:hover:bg-white/10",
        ].join(" ")}
      >
        <Type className="h-3.5 w-3.5 shrink-0 text-gray-600 dark:text-gray-300" />
        <span
          className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/25"
          style={{ backgroundColor: currentColor }}
        />
        <ChevronDown className="h-3 w-3 shrink-0 text-gray-500" />
      </button>
      {panel}
    </div>
  );
}

export function HighlightColorDropdown({
  editor,
  isHighlightActive,
  highlightColor,
  dropdownPlacement,
}: {
  editor: Editor;
  isHighlightActive: boolean;
  highlightColor: string;
  dropdownPlacement: "below" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [pickerValue, setPickerValue] = useState(() => hexForColorInput(highlightColor));

  useLayoutEffect(() => {
    if (!open) {
      setDropdownStyle(null);
      return;
    }
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    if (dropdownPlacement === "right") {
      setDropdownStyle({ left: rect.right + 4, top: rect.top });
    } else {
      setDropdownStyle({ left: rect.left, top: rect.bottom + 4 });
    }
  }, [open, dropdownPlacement]);

  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current;
    const fit = () => fitFixedDropdownToViewport(el, setDropdownStyle);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, dropdownStyle]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      if (dropdownPlacement === "right") {
        setDropdownStyle({ left: rect.right + 4, top: rect.top });
      } else {
        setDropdownStyle({ left: rect.left, top: rect.bottom + 4 });
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, dropdownPlacement]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if ((target as Element).closest?.("[data-board-toolbar-portal]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [open]);

  useEffect(() => {
    if (open) setPickerValue(hexForColorInput(highlightColor));
  }, [open, highlightColor]);

  const panel =
    open &&
    dropdownStyle &&
    createPortal(
      <div
        ref={panelRef}
        data-board-toolbar-portal
        className="fixed z-[99999] min-w-[200px] max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white py-1.5 shadow-xl dark:border-gray-600 dark:bg-gray-800"
        style={{ left: dropdownStyle.left, top: dropdownStyle.top }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Highlight
        </p>
        {isHighlightActive && (
          <div className="px-2.5 pb-2">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().unsetHighlight().run();
                setOpen(false);
              }}
              className="w-full rounded-md border border-black/10 px-2 py-1.5 text-left text-xs text-gray-800 hover:bg-gray-50 dark:border-white/15 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              Remove highlight
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 px-2.5">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleHighlight({ color: c.value }).run();
                setOpen(false);
              }}
              title={c.label}
              className={[
                "h-7 w-7 rounded-md border transition-transform",
                highlightColor === c.value && isHighlightActive
                  ? "scale-105 border-gray-800 ring-2 ring-sky-400/80"
                  : "border-black/20 hover:scale-105",
              ].join(" ")}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
        <div className="mt-2 border-t border-black/10 px-2.5 pt-2 dark:border-white/10">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              colorInputRef.current?.click();
            }}
            className="w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-left text-xs text-gray-800 hover:bg-gray-50 dark:border-white/15 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            Custom color…
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={pickerValue}
            onChange={(e) => {
              const v = e.target.value;
              setPickerValue(v);
              editor.chain().focus().toggleHighlight({ color: v }).run();
              setOpen(false);
            }}
            className="pointer-events-none fixed h-px w-px opacity-0"
            tabIndex={-1}
            aria-hidden
          />
        </div>
      </div>,
      document.body,
    );

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) {
            setOpen(false);
          } else {
            setOpen(true);
          }
        }}
        title="Highlight color"
        className={[
          "flex h-6 items-center gap-1 rounded border border-black/15 bg-white/60 px-1.5 transition-colors dark:bg-gray-800/60 dark:border-white/15",
          isHighlightActive ? "bg-amber-50/80 dark:bg-amber-900/25" : "",
          open ? "ring-1 ring-sky-400/60" : "hover:bg-black/5 dark:hover:bg-white/10",
        ].join(" ")}
      >
        <Highlighter className="h-3.5 w-3.5 shrink-0 text-gray-600 dark:text-gray-300" />
        <span
          className="h-3.5 w-3.5 shrink-0 rounded border border-black/25"
          style={{ backgroundColor: highlightColor }}
        />
        <ChevronDown className="h-3 w-3 shrink-0 text-gray-500" />
      </button>
      {panel}
    </div>
  );
}

/** Visible but non-interactive toolbar (no editor — e.g. no note in edit mode). */
function NoteToolbarIdleHorizontal({ segment = "all" }: { segment?: "all" | "primary" | "secondary" }) {
  return (
    <div
      className="space-y-1.5 border-b border-black/10 px-2 pb-2 pt-1 opacity-[0.55]"
      role="toolbar"
      aria-label="Text formatting. Open a note or card to edit."
      aria-disabled="true"
    >
      <div className="flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap pointer-events-none select-none scrollbar-hide">
        <div className="shrink-0">
          <FontFamilySearch
            editor={null}
            className="shrink-0"
            inputClassName="!min-w-[7rem] !max-w-[9rem] !text-[9px]"
          />
        </div>
        <div className="shrink-0">
          <FontSizeSearch
            editor={null}
            className="shrink-0"
            inputClassName="!min-w-[3rem] !max-w-[3.75rem] !text-[9px]"
          />
        </div>
        <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />
        {(segment === "all" || segment === "primary") &&
          [Bold, Italic, Underline, Strikethrough].map((Icon, i) => (
          <span
            key={i}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400"
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        ))}
        {(segment === "all" || segment === "primary") && <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />}
        {(segment === "all" || segment === "primary") &&
          [AlignLeft, AlignCenter, AlignRight].map((Icon, i) => (
          <span key={i} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400">
            <Icon className="h-3.5 w-3.5" />
          </span>
        ))}
        {(segment === "all" || segment === "secondary") && <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />}
        {(segment === "all" || segment === "secondary") && <span className="flex h-6 shrink-0 items-center gap-0.5 rounded px-1.5 text-gray-400">
          <List className="h-3.5 w-3.5" />
          <ChevronDown className="h-3 w-3" />
        </span>}
        {(segment === "all" || segment === "secondary") && <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />}
        {(segment === "all" || segment === "secondary") && <span className="flex h-6 w-6 shrink-0 items-center justify-center text-gray-400">
          <LinkIcon className="h-3.5 w-3.5" />
        </span>}
        {(segment === "all" || segment === "secondary") && <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />}
        {(segment === "all" || segment === "secondary") && <span className="flex h-6 shrink-0 items-center gap-1 rounded border border-black/15 px-1.5 text-gray-400">
          <Type className="h-3.5 w-3.5" />
          <span className="h-3.5 w-3.5 rounded-full border border-black/20 bg-gray-600" />
          <ChevronDown className="h-3 w-3" />
        </span>}
        {(segment === "all" || segment === "secondary") && <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />}
        {(segment === "all" || segment === "secondary") && <span className="flex h-6 shrink-0 items-center gap-1 rounded border border-black/15 px-1.5 text-gray-400">
          <Highlighter className="h-3.5 w-3.5" />
          <span className="h-3.5 w-3.5 rounded border border-black/20 bg-yellow-200" />
          <ChevronDown className="h-3 w-3" />
        </span>}
      </div>
    </div>
  );
}

function NoteToolbarActive({
  editor,
  variant = "horizontal",
  segment = "all",
}: NoteToolbarProps & { editor: Editor }) {
  const activeState = useEditorState({
    editor,
    selector: (ctx) => {
      const ed = ctx.editor;
      if (!ed) return null;
      return {
        isBold: ed.isActive("bold"),
        isItalic: ed.isActive("italic"),
        isUnderline: ed.isActive("underline"),
        isStrike: ed.isActive("strike"),
        isLink: ed.isActive("link"),
        textAlignLeft: ed.isActive({ textAlign: "left" }),
        textAlignCenter: ed.isActive({ textAlign: "center" }),
        textAlignRight: ed.isActive({ textAlign: "right" }),
        color: ed.getAttributes("textStyle").color as string | undefined,
        isHighlight: ed.isActive("highlight"),
        highlightColor: (ed.getAttributes("highlight").color as string | undefined) ?? "#fef08a",
      };
    },
  });

  const state = activeState ?? {
    isBold: false, isItalic: false, isUnderline: false, isStrike: false, isLink: false,
    textAlignLeft: false, textAlignCenter: false, textAlignRight: false, color: undefined,
    isHighlight: false, highlightColor: "#fef08a",
  };
  const currentColor = state.color ?? "#1f2937";

  const listPlacement = variant === "vertical" ? "right" : "below";

  const formattingRow = (
    <>
      <ToolbarButton
        isActive={state.isBold}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        isActive={state.isItalic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        isActive={state.isUnderline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        <Underline className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        isActive={state.isStrike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
    </>
  );

  const alignRow = (
    <>
      <ToolbarButton
        isActive={state.textAlignLeft}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        title="Align Left"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        isActive={state.textAlignCenter}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        title="Align Center"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        isActive={state.textAlignRight}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        title="Align Right"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </ToolbarButton>
    </>
  );

  if (variant === "vertical") {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-1.5 overflow-y-auto overflow-x-hidden px-1.5 py-1.5">
        <div onMouseDown={(e) => e.stopPropagation()}>
          <FontFamilySearch editor={editor} variant="vertical" />
        </div>

        <div className="w-full [&_input]:w-full" onMouseDown={(e) => e.stopPropagation()}>
          <FontSizeSearch editor={editor} variant="vertical" defaultSize={14} />
        </div>

        <div className="h-px w-full shrink-0 bg-black/10" />

        <div className="flex flex-col items-center gap-0.5">{formattingRow}</div>

        <div className="h-px w-full shrink-0 bg-black/10" />

        <div className="flex flex-col items-center gap-0.5">{alignRow}</div>

        <div className="h-px w-full shrink-0 bg-black/10" />

        <div className="flex justify-center">
          <ListDropdownButton editor={editor} dropdownPlacement={listPlacement} />
        </div>

        <div className="h-px w-full shrink-0 bg-black/10" />

        <div className="flex justify-center">
          <LinkButton editor={editor} isLinkActive={state.isLink} />
        </div>

        <div className="h-px w-full shrink-0 bg-black/10" />

        <div className="flex w-full justify-center">
          <TextColorDropdown
            editor={editor}
            currentColor={currentColor}
            dropdownPlacement={listPlacement}
          />
        </div>

        <div className="h-px w-full shrink-0 bg-black/10" />

        <div className="flex w-full justify-center">
          <HighlightColorDropdown
            editor={editor}
            isHighlightActive={state.isHighlight}
            highlightColor={state.highlightColor}
            dropdownPlacement={listPlacement}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="note-toolbar-horizontal space-y-1.5 border-b border-black/10 px-2 pb-2 pt-1">
      {/* Row 1: Text formatting */}
      <div className="note-toolbar-row flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
        {/* Font family (searchable) */}
        <div className="shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          <FontFamilySearch
            editor={editor}
            variant="horizontal"
            className="shrink-0"
            inputClassName="!min-w-[7rem] !max-w-[9rem] !text-[9px]"
          />
        </div>

        {/* Font size (searchable) */}
        <div className="shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          <FontSizeSearch
            editor={editor}
            variant="horizontal"
            defaultSize={14}
            className="shrink-0"
            inputClassName="!min-w-[3rem] !max-w-[3.75rem] !text-[9px]"
          />
        </div>

        {(segment === "all" || segment === "primary") && <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />}

        {(segment === "all" || segment === "primary") && (
          <div className="flex shrink-0 flex-nowrap items-center gap-1">{formattingRow}</div>
        )}

        {(segment === "all" || segment === "primary") && <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />}

        {(segment === "all" || segment === "primary") && (
          <div className="flex shrink-0 flex-nowrap items-center gap-1">{alignRow}</div>
        )}

        {(segment === "all" || segment === "secondary") && <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />}

        {(segment === "all" || segment === "secondary") && (
          <div className="shrink-0">
            <ListDropdownButton editor={editor} dropdownPlacement={listPlacement} />
          </div>
        )}

        {(segment === "all" || segment === "secondary") && <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />}

        {(segment === "all" || segment === "secondary") && (
          <div className="shrink-0">
            <LinkButton editor={editor} isLinkActive={state.isLink} />
          </div>
        )}

        {(segment === "all" || segment === "secondary") && <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />}

        {(segment === "all" || segment === "secondary") && (
          <div className="shrink-0">
            <TextColorDropdown
              editor={editor}
              currentColor={currentColor}
              dropdownPlacement={listPlacement}
            />
          </div>
        )}

        {(segment === "all" || segment === "secondary") && <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />}

        {(segment === "all" || segment === "secondary") && (
          <div className="shrink-0">
            <HighlightColorDropdown
              editor={editor}
              isHighlightActive={state.isHighlight}
              highlightColor={state.highlightColor}
              dropdownPlacement={listPlacement}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function NoteToolbar(props: NoteToolbarProps) {
  if (!props.editor) {
    if (props.variant === "vertical") return null;
    return <NoteToolbarIdleHorizontal segment={props.segment ?? "all"} />;
  }
  return <NoteToolbarActive {...props} editor={props.editor} />;
}
