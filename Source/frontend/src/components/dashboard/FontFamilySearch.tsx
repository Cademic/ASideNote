import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { FONT_FAMILIES } from "../../lib/fontFamilies";
import { fitFixedDropdownToViewport } from "../../lib/dropdown-viewport";

function labelForFontValue(value: string | undefined): string {
  if (!value) return FONT_FAMILIES[0].label;
  const hit = FONT_FAMILIES.find((f) => f.value === value);
  if (hit) return hit.label;
  const first = value.split(",")[0]?.replace(/['"]/g, "").trim();
  return first || "Custom";
}

export interface FontFamilySearchProps {
  editor: Editor | null;
  /** Horizontal bar (default) or full-width vertical strip */
  variant?: "horizontal" | "vertical";
  /** Extra classes on the outer wrapper */
  className?: string;
  /** Override input classes (merged with defaults) */
  inputClassName?: string;
  /** Notebook / menu: slightly larger text */
  size?: "toolbar" | "menu";
}

const defaultInputToolbar =
  "h-6 rounded border border-black/15 bg-white/60 px-1.5 text-[10px] text-gray-700 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-300/50 dark:border-white/20 dark:bg-white/10 dark:text-gray-100 dark:placeholder:text-gray-500";

const defaultInputMenu =
  "h-8 rounded border border-border bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30";

function fontSearchBaseInput(
  variant: FontFamilySearchProps["variant"],
  size: FontFamilySearchProps["size"],
) {
  const v = variant ?? "horizontal";
  const s = size ?? "toolbar";
  return s === "menu"
    ? `${defaultInputMenu} ${v === "vertical" ? "w-full min-w-0" : "min-w-[10rem] max-w-[16rem]"}`
    : `${defaultInputToolbar} ${v === "vertical" ? "w-full min-w-0" : "min-w-[9rem] max-w-[12rem]"}`;
}

function FontFamilySearchDisabled({
  variant,
  size,
  className,
  inputClassName,
}: Pick<FontFamilySearchProps, "variant" | "size" | "className" | "inputClassName">) {
  const baseInput = fontSearchBaseInput(variant, size);
  return (
    <div className={className}>
      <input
        type="search"
        disabled
        placeholder="Search fonts…"
        className={`${baseInput} opacity-60 ${inputClassName ?? ""}`}
        title="Font family"
        aria-label="Font family"
      />
    </div>
  );
}

function FontFamilySearchActive({
  editor,
  variant = "horizontal",
  size = "toolbar",
  className = "",
  inputClassName = "",
}: Omit<FontFamilySearchProps, "editor"> & { editor: Editor }) {
  const listboxId = useId();

  const fontValue = useEditorState({
    editor,
    selector: (ctx) => ctx.editor.getAttributes("textStyle").fontFamily as string | undefined,
  });

  const currentLabel = useMemo(() => labelForFontValue(fontValue), [fontValue]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<{ left: number; top: number } | null>(null);
  const [panelMinWidth, setPanelMinWidth] = useState<number>(192);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FONT_FAMILIES;
    return FONT_FAMILIES.filter(
      (f) => f.label.toLowerCase().includes(q) || f.value.toLowerCase().includes(q),
    );
  }, [query]);

  const applyFont = useCallback(
    (value: string) => {
      editor.chain().focus().setFontFamily(value).run();
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    },
    [editor],
  );

  const syncDropdownPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setDropdownStyle({ left: r.left, top: r.bottom + 4 });
    setPanelMinWidth(Math.max(r.width, 192));
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
      if ((e.target as Element).closest?.("[data-font-family-portal]")) return;
      if ((e.target as Element).closest?.("[data-board-toolbar-portal]")) return;
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () => document.removeEventListener("pointerdown", onDocPointerDown, true);
  }, [open]);

  const onInputFocus = () => {
    setOpen(true);
    // Empty query lists every font; user types to narrow. (Using the current label here filtered the list.)
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
    }
  };

  const baseInput = fontSearchBaseInput(variant, size);

  const showList = open && filtered.length > 0;
  const showEmpty = open && filtered.length === 0;
  const showPortal = (showList || showEmpty) && dropdownStyle;

  const rowText =
    size === "menu"
      ? "px-2 py-1.5 text-left text-sm text-gray-800 hover:bg-sky-100 dark:text-gray-100 dark:hover:bg-sky-900/40"
      : "px-2 py-1 text-left text-[10px] text-gray-800 hover:bg-sky-100 dark:text-gray-100 dark:hover:bg-sky-900/40";
  const emptyText = size === "menu" ? "px-2 py-1.5 text-sm text-muted-foreground" : "px-2 py-1.5 text-[10px] text-gray-500 dark:text-gray-400";

  const listPanel =
    showPortal &&
    createPortal(
      <div
        id={listboxId}
        ref={panelRef}
        role="listbox"
        data-font-family-portal
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
          <div className={emptyText}>No fonts match</div>
        ) : (
          filtered.map((f) => (
            <button
              key={f.value}
              type="button"
              role="option"
              className={`flex w-full ${rowText}`}
              style={{ fontFamily: f.value }}
              onMouseDown={(e) => {
                e.preventDefault();
                applyFont(f.value);
              }}
            >
              {f.label}
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
        aria-autocomplete="list"
        placeholder="Search fonts…"
        title="Font family — type to filter"
        value={open ? query : currentLabel}
        onChange={onInputChange}
        onFocus={onInputFocus}
        onKeyDown={onKeyDown}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className={`${baseInput} ${inputClassName ?? ""}`}
      />
      {listPanel}
    </div>
  );
}

export function FontFamilySearch({
  editor,
  variant = "horizontal",
  size = "toolbar",
  className = "",
  inputClassName = "",
}: FontFamilySearchProps) {
  if (!editor) {
    return (
      <FontFamilySearchDisabled variant={variant} size={size} className={className} inputClassName={inputClassName} />
    );
  }
  return (
    <FontFamilySearchActive
      editor={editor}
      variant={variant}
      size={size}
      className={className}
      inputClassName={inputClassName}
    />
  );
}

/** Search + list for menus (Edit → Font); does not use TipTap editor state hook when editor is null */
export function FontFamilySearchMenu({
  currentFontValue,
  onPick,
  className = "",
}: {
  currentFontValue: string | undefined;
  onPick: (value: string) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FONT_FAMILIES;
    return FONT_FAMILIES.filter(
      (f) => f.label.toLowerCase().includes(q) || f.value.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className={`flex flex-col gap-1 px-2 py-1.5 ${className}`}>
      <input
        type="search"
        placeholder="Search fonts…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className={`${defaultInputMenu} w-full`}
        autoComplete="off"
        autoCorrect="off"
        aria-label="Search fonts"
      />
      <div
        className="max-h-48 overflow-y-auto rounded border border-border/60 bg-background py-0.5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {filtered.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">No fonts match</div>
        ) : (
          filtered.map((f) => {
            const selected = currentFontValue === f.value;
            return (
              <button
                key={f.value}
                type="button"
                className={`flex w-full px-2 py-1.5 text-left text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 ${
                  selected ? "bg-sky-50 dark:bg-sky-900/30" : ""
                }`}
                style={{ fontFamily: f.value }}
                title={f.label}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPick(f.value);
                  setQuery("");
                }}
              >
                {f.label}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
