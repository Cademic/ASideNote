import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  FONT_SIZE_PRESETS as DEFAULT_PRESETS,
  MAX_FONT_SIZE as DEFAULT_MAX,
  MIN_FONT_SIZE as DEFAULT_MIN,
} from "./noteToolbarConstants";
import { fitFixedDropdownToViewport } from "../../lib/dropdown-viewport";

export function parseFontSizeAttr(raw: string | undefined | null, fallback: number): number {
  if (!raw) return fallback;
  const n = parseInt(String(raw).replace(/px$/i, "").trim(), 10);
  return Number.isNaN(n) ? fallback : n;
}

function mergePresetsWithCurrent(presets: number[], current: number, minSize: number, maxSize: number): number[] {
  const arr = [...presets];
  if (current >= minSize && current <= maxSize && !arr.includes(current)) {
    arr.push(current);
    arr.sort((a, b) => a - b);
  }
  return arr;
}

export interface FontSizeSearchProps {
  editor: Editor | null;
  variant?: "horizontal" | "vertical";
  className?: string;
  inputClassName?: string;
  size?: "toolbar" | "menu";
  /** Defaults: board presets (8–48) */
  presets?: number[];
  minSize?: number;
  maxSize?: number;
  /** When fontSize attribute is missing (e.g. 14 for board, 12 for notebook) */
  defaultSize?: number;
}

const defaultInputToolbar =
  "h-6 rounded border border-black/15 bg-white/60 px-1.5 text-[10px] text-gray-700 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-300/50 dark:border-white/20 dark:bg-white/10 dark:text-gray-100 dark:placeholder:text-gray-500";

const defaultInputMenu =
  "h-8 rounded border border-border bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30";

function sizeSearchBaseInput(variant: FontSizeSearchProps["variant"], size: FontSizeSearchProps["size"]) {
  const v = variant ?? "horizontal";
  const s = size ?? "toolbar";
  return s === "menu"
    ? `${defaultInputMenu} ${v === "vertical" ? "w-full min-w-0" : "min-w-[4rem] max-w-[6rem]"}`
    : `${defaultInputToolbar} ${v === "vertical" ? "w-full min-w-0" : "min-w-[3.5rem] max-w-[5.5rem]"}`;
}

function FontSizeSearchDisabled({
  variant,
  size,
  className,
  inputClassName,
}: Pick<FontSizeSearchProps, "variant" | "size" | "className" | "inputClassName">) {
  const baseInput = sizeSearchBaseInput(variant, size);
  return (
    <div className={className}>
      <input
        type="search"
        disabled
        placeholder="Size…"
        className={`${baseInput} opacity-60 ${inputClassName ?? ""}`}
        title="Font size"
        aria-label="Font size"
      />
    </div>
  );
}

function FontSizeSearchActive({
  editor,
  variant = "horizontal",
  size = "toolbar",
  className = "",
  inputClassName = "",
  presets = DEFAULT_PRESETS,
  minSize = DEFAULT_MIN,
  maxSize = DEFAULT_MAX,
  defaultSize = 14,
}: Omit<FontSizeSearchProps, "editor"> & { editor: Editor }) {
  const listboxId = useId();

  const fontSizeRaw = useEditorState({
    editor,
    selector: (ctx) => ctx.editor.getAttributes("textStyle").fontSize as string | undefined,
  });

  const currentNum = useMemo(
    () => parseFontSizeAttr(fontSizeRaw, defaultSize),
    [fontSizeRaw, defaultSize],
  );

  const displayClosed = `${currentNum}px`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<{ left: number; top: number } | null>(null);
  const [panelMinWidth, setPanelMinWidth] = useState(120);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const applyPx = useCallback(
    (num: number) => {
      const n = Math.min(maxSize, Math.max(minSize, Math.round(num)));
      editor.chain().focus().setFontSize(`${n}px`).run();
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    },
    [editor, minSize, maxSize],
  );

  const mergedSizes = useMemo(
    () => mergePresetsWithCurrent(presets, currentNum, minSize, maxSize),
    [presets, currentNum, minSize, maxSize],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/px$/i, "").replace(/\s/g, "");
    if (!q) return mergedSizes;
    return mergedSizes.filter((s) => String(s).includes(q));
  }, [mergedSizes, query]);

  const syncDropdownPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setDropdownStyle({ left: r.left, top: r.bottom + 4 });
    setPanelMinWidth(Math.max(r.width, 120));
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setDropdownStyle(null);
      return;
    }
    syncDropdownPosition();
  }, [open, syncDropdownPosition]);

  useLayoutEffect(() => {
    if (!open || !dropdownStyle || !panelRef.current) return;
    const el = panelRef.current;
    const fit = () => fitFixedDropdownToViewport(el, setDropdownStyle);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, dropdownStyle]);

  useEffect(() => {
    if (!open) return;
    const onResizeOrScroll = () => syncDropdownPosition();
    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true);
    return () => {
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
    };
  }, [open, syncDropdownPosition]);

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      if ((e.target as Element).closest?.("[data-font-size-portal]")) return;
      if ((e.target as Element).closest?.("[data-board-toolbar-portal]")) return;
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () => document.removeEventListener("pointerdown", onDocPointerDown, true);
  }, [open]);

  const onInputFocus = () => {
    setOpen(true);
    setQuery("");
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!open) setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const raw = query.trim().replace(/px$/i, "");
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n >= minSize && n <= maxSize) {
        applyPx(n);
      }
    }
  };

  const baseInput = sizeSearchBaseInput(variant, size);

  const showList = open && filtered.length > 0;
  const showEmpty = open && filtered.length === 0;
  const showPortal = (showList || showEmpty) && dropdownStyle;

  const rowText =
    size === "menu"
      ? "px-2 py-1.5 text-left text-sm text-gray-800 hover:bg-sky-100 dark:text-gray-100 dark:hover:bg-sky-900/40"
      : "px-2 py-1 text-left text-[10px] text-gray-800 hover:bg-sky-100 dark:text-gray-100 dark:hover:bg-sky-900/40";
  const emptyText =
    size === "menu" ? "px-2 py-1.5 text-sm text-muted-foreground" : "px-2 py-1.5 text-[10px] text-gray-500 dark:text-gray-400";

  const listPanel =
    showPortal &&
    createPortal(
      <div
        id={listboxId}
        ref={panelRef}
        role="listbox"
        data-font-size-portal
        data-board-toolbar-portal
        className="fixed z-[99999] max-h-[min(50vh,20rem)] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-md border border-black/15 bg-white py-1 shadow-xl dark:border-gray-600 dark:bg-zinc-900"
        style={{
          left: dropdownStyle.left,
          top: dropdownStyle.top,
          minWidth: panelMinWidth,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {showEmpty ? (
          <div className={emptyText}>No sizes match</div>
        ) : (
          filtered.map((s) => (
            <button
              key={s}
              type="button"
              role="option"
              className={`flex w-full ${rowText}`}
              onMouseDown={(e) => {
                e.preventDefault();
                applyPx(s);
              }}
            >
              {s}px
            </button>
          ))
        )}
      </div>,
      document.body,
    );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        inputMode="numeric"
        placeholder="Size…"
        title="Font size (px) — type to filter"
        value={open ? query : displayClosed}
        onChange={onInputChange}
        onFocus={onInputFocus}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck={false}
        className={`${baseInput} ${inputClassName ?? ""}`}
      />
      {listPanel}
    </div>
  );
}

export function FontSizeSearch({
  editor,
  variant = "horizontal",
  size = "toolbar",
  className = "",
  inputClassName = "",
  presets,
  minSize,
  maxSize,
  defaultSize,
}: FontSizeSearchProps) {
  if (!editor) {
    return (
      <FontSizeSearchDisabled variant={variant} size={size} className={className} inputClassName={inputClassName} />
    );
  }
  return (
    <FontSizeSearchActive
      editor={editor}
      variant={variant}
      size={size}
      className={className}
      inputClassName={inputClassName}
      presets={presets}
      minSize={minSize}
      maxSize={maxSize}
      defaultSize={defaultSize}
    />
  );
}

/** Flyout menus (mobile / notebook bar) */
export function FontSizeSearchMenu({
  currentSizePx,
  onPick,
  presets = DEFAULT_PRESETS,
  minSize = DEFAULT_MIN,
  maxSize = DEFAULT_MAX,
  className = "",
}: {
  currentSizePx: number;
  onPick: (px: number) => void;
  presets?: number[];
  minSize?: number;
  maxSize?: number;
  className?: string;
}) {
  const [query, setQuery] = useState("");

  const merged = useMemo(
    () => mergePresetsWithCurrent(presets, currentSizePx, minSize, maxSize),
    [presets, currentSizePx, minSize, maxSize],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/px$/i, "").replace(/\s/g, "");
    if (!q) return merged;
    return merged.filter((s) => String(s).includes(q));
  }, [merged, query]);

  return (
    <div className={`flex min-w-[200px] flex-col gap-1 px-2 py-1.5 ${className}`}>
      <input
        type="search"
        placeholder="Search size…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className={`${defaultInputMenu} w-full`}
        autoComplete="off"
        aria-label="Search font sizes"
      />
      <div
        className="max-h-48 overflow-y-auto rounded border border-border/60 bg-background py-0.5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {filtered.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">No sizes match</div>
        ) : (
          filtered.map((s) => (
            <button
              key={s}
              type="button"
              className={`flex w-full px-2 py-1.5 text-left text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 ${
                s === currentSizePx ? "bg-sky-50 dark:bg-sky-900/30" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const n = Math.min(maxSize, Math.max(minSize, s));
                onPick(n);
                setQuery("");
              }}
            >
              {s}px
            </button>
          ))
        )}
      </div>
    </div>
  );
}
