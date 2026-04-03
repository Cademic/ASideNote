import { useCallback, useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
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
  FONT_FAMILIES,
  FONT_SIZE_PRESETS,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  TEXT_COLORS,
} from "./noteToolbarConstants";

interface NoteToolbarProps {
  editor: Editor | null;
  /** Horizontal bar (default) or narrow vertical strip for left-docked toolbars */
  variant?: "horizontal" | "vertical";
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

  useLayoutEffect(() => {
    if (!open) {
      setDropdownStyle(null);
      return;
    }
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      if (dropdownPlacement === "right") {
        setDropdownStyle({ left: rect.right + 4, top: rect.top });
      } else {
        setDropdownStyle({ left: rect.left, top: rect.bottom + 4 });
      }
    }
  }, [open, dropdownPlacement]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if ((target as Element).closest?.("[data-board-toolbar-portal]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
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
            const rect = buttonRef.current?.getBoundingClientRect();
            if (rect) {
              if (dropdownPlacement === "right") {
                setDropdownStyle({ left: rect.right + 4, top: rect.top });
              } else {
                setDropdownStyle({ left: rect.left, top: rect.bottom + 4 });
              }
            }
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
            data-board-toolbar-portal
            className="fixed z-[99999] min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-600 dark:bg-gray-800"
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

function parseFontSize(raw: string | undefined | null): number {
  if (!raw) return 14;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? 14 : n;
}

function LinkButton({ editor, isLinkActive }: { editor: Editor; isLinkActive: boolean }) {
  const [showInput, setShowInput] = useState(false);
  const [url, setUrl] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isLink = isLinkActive;

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
      className="absolute left-1/2 top-1/2 z-50 flex w-[calc(100%-40px)] max-w-[320px] -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-600 dark:bg-gray-800"
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
          className="absolute left-1/2 top-full z-50 mt-1 flex w-64 -translate-x-1/2 items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-600 dark:bg-gray-800"
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

function FontSizeInput({ editor }: { editor: Editor }) {
  const currentRaw = editor.getAttributes("textStyle").fontSize as
    | string
    | undefined;
  const currentNum = parseFontSize(currentRaw);
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState(String(currentNum));

  function applySize(val: string) {
    let num = parseInt(val, 10);
    if (Number.isNaN(num)) num = 14;
    num = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, num));
    setCustomValue(String(num));
    editor.chain().focus().setFontSize(`${num}px`).run();
  }

  if (isCustom) {
    return (
      <input
        autoFocus
        type="number"
        min={MIN_FONT_SIZE}
        max={MAX_FONT_SIZE}
        value={customValue}
        onChange={(e) => setCustomValue(e.target.value)}
        onBlur={(e) => {
          applySize(e.target.value);
          setIsCustom(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            applySize((e.target as HTMLInputElement).value);
            setIsCustom(false);
            e.preventDefault();
          }
          if (e.key === "Escape") {
            setIsCustom(false);
          }
        }}
        onMouseDown={(e) => e.stopPropagation()}
        title="Font size (px)"
        className="h-6 w-14 rounded border border-black/15 bg-white/60 px-1 text-center text-[10px] text-gray-700 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    );
  }

  // Determine select value: match a preset or show "custom"
  const selectValue = FONT_SIZE_PRESETS.includes(currentNum)
    ? String(currentNum)
    : "custom";

  return (
    <select
      value={selectValue}
      onChange={(e) => {
        if (e.target.value === "custom") {
          setCustomValue(String(currentNum));
          setIsCustom(true);
        } else {
          applySize(e.target.value);
        }
      }}
      onMouseDown={(e) => e.stopPropagation()}
      title="Font Size"
      className="h-6 rounded border border-black/15 bg-white/60 px-1 text-[10px] text-gray-700 focus:outline-none"
    >
      {FONT_SIZE_PRESETS.map((s) => (
        <option key={s} value={String(s)}>
          {s}px
        </option>
      ))}
      {!FONT_SIZE_PRESETS.includes(currentNum) && (
        <option value="custom">{currentNum}px</option>
      )}
      <option value="custom">Custom...</option>
    </select>
  );
}

/** Visible but non-interactive toolbar (no editor — e.g. no note in edit mode). */
function NoteToolbarIdleHorizontal() {
  return (
    <div
      className="space-y-1.5 border-b border-black/10 px-2 pb-2 pt-1 opacity-[0.55]"
      role="toolbar"
      aria-label="Text formatting. Open a note or card to edit."
      aria-disabled="true"
    >
      <div className="flex flex-wrap items-center gap-1 pointer-events-none select-none">
        <select
          disabled
          className="h-6 rounded border border-black/15 bg-white/60 px-1 text-[10px] text-gray-500"
          title="Font Family"
          value={FONT_FAMILIES[0].value}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select disabled className="h-6 rounded border border-black/15 bg-white/60 px-1 text-[10px] text-gray-500" title="Font Size" value="14">
          <option value="14">14px</option>
        </select>
        <div className="mx-0.5 h-4 w-px bg-black/10" />
        {[Bold, Italic, Underline, Strikethrough].map((Icon, i) => (
          <span
            key={i}
            className="flex h-6 w-6 items-center justify-center rounded text-gray-400"
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        ))}
        <div className="mx-0.5 h-4 w-px bg-black/10" />
        {[AlignLeft, AlignCenter, AlignRight].map((Icon, i) => (
          <span key={i} className="flex h-6 w-6 items-center justify-center rounded text-gray-400">
            <Icon className="h-3.5 w-3.5" />
          </span>
        ))}
        <div className="mx-0.5 h-4 w-px bg-black/10" />
        <span className="flex h-6 items-center gap-0.5 rounded px-1.5 text-gray-400">
          <List className="h-3.5 w-3.5" />
          <ChevronDown className="h-3 w-3" />
        </span>
        <div className="mx-0.5 h-4 w-px bg-black/10" />
        <span className="flex h-6 w-6 items-center justify-center text-gray-400">
          <LinkIcon className="h-3.5 w-3.5" />
        </span>
        <div className="mx-0.5 h-4 w-px bg-black/10" />
        <div className="flex items-center gap-0.5">
          <Type className="mr-0.5 h-3 w-3 text-gray-400" />
          {TEXT_COLORS.map((c) => (
            <span
              key={c.value}
              className="h-4 w-4 rounded-full border border-black/20"
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function NoteToolbarActive({
  editor,
  variant = "horizontal",
}: NoteToolbarProps & { editor: Editor }) {
  const setFontFamily = useCallback(
    (value: string) => {
      editor.chain().focus().setFontFamily(value).run();
    },
    [editor],
  );

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
      };
    },
  });

  const state = activeState ?? {
    isBold: false, isItalic: false, isUnderline: false, isStrike: false, isLink: false,
    textAlignLeft: false, textAlignCenter: false, textAlignRight: false, color: undefined,
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

  const colorSwatches = (
    <div className={variant === "vertical" ? "flex flex-col items-center gap-0.5" : "flex items-center gap-0.5"}>
      <Type className={variant === "vertical" ? "h-3 w-3 text-gray-500" : "mr-0.5 h-3 w-3 text-gray-500"} />
      <div className={variant === "vertical" ? "flex flex-col gap-0.5" : "flex items-center gap-0.5"}>
        {TEXT_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().setColor(c.value).run();
            }}
            title={c.label}
            className={[
              "h-4 w-4 rounded-full border transition-transform",
              currentColor === c.value
                ? "scale-110 border-gray-800 ring-1 ring-gray-400"
                : "border-black/20 hover:scale-110",
            ].join(" ")}
            style={{ backgroundColor: c.value }}
          />
        ))}
      </div>
    </div>
  );

  if (variant === "vertical") {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-1.5 overflow-y-auto overflow-x-hidden px-1.5 py-1.5">
        <select
          value={
            editor.getAttributes("textStyle").fontFamily ??
            FONT_FAMILIES[0].value
          }
          onChange={(e) => setFontFamily(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          className="h-6 w-full min-w-0 rounded border border-black/15 bg-white/60 px-0.5 text-[9px] text-gray-700 focus:outline-none"
          title="Font Family"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <div className="w-full [&_input]:w-full [&_select]:w-full">
          <FontSizeInput editor={editor} />
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

        {colorSwatches}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 border-b border-black/10 px-2 pb-2 pt-1">
      {/* Row 1: Text formatting */}
      <div className="flex flex-wrap items-center gap-1">
        {/* Font family */}
        <select
          value={
            editor.getAttributes("textStyle").fontFamily ??
            FONT_FAMILIES[0].value
          }
          onChange={(e) => setFontFamily(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          className="h-6 rounded border border-black/15 bg-white/60 px-1 text-[10px] text-gray-700 focus:outline-none"
          title="Font Family"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Font size input */}
        <FontSizeInput editor={editor} />

        <div className="mx-0.5 h-4 w-px bg-black/10" />

        {/* Bold / Italic / Underline / Strikethrough */}
        <div className="flex flex-wrap items-center gap-1">{formattingRow}</div>

        <div className="mx-0.5 h-4 w-px bg-black/10" />

        {/* Text alignment */}
        <div className="flex flex-wrap items-center gap-1">{alignRow}</div>

        <div className="mx-0.5 h-4 w-px bg-black/10" />

        {/* List dropdown */}
        <ListDropdownButton editor={editor} dropdownPlacement={listPlacement} />

        <div className="mx-0.5 h-4 w-px bg-black/10" />

        {/* Link / Unlink */}
        <LinkButton editor={editor} isLinkActive={state.isLink} />

        <div className="mx-0.5 h-4 w-px bg-black/10" />

        {/* Text color swatches */}
        {colorSwatches}
      </div>
    </div>
  );
}

export function NoteToolbar(props: NoteToolbarProps) {
  if (!props.editor) {
    if (props.variant === "vertical") return null;
    return <NoteToolbarIdleHorizontal />;
  }
  return <NoteToolbarActive {...props} editor={props.editor} />;
}
