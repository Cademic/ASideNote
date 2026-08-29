import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  Clock,
  FolderOpen,
  LayoutDashboard,
  Palette,
  Search,
  StickyNote,
  X,
} from "lucide-react";
import { useGlobalSearch } from "../../context/GlobalSearchContext";
import { useDebounce } from "../../hooks/useDebounce";
import { fitFixedDropdownToViewport } from "../../lib/dropdown-viewport";
import {
  buildSnippet,
  matchesTokens,
  searchEntries,
  tokenize,
  type SearchEntryKind,
  type SearchIndexEntry,
} from "../../lib/global-search";
import { QUICK_ACTIONS, type QuickAction } from "../../lib/global-search-actions";
import {
  getRecents,
  pushRecentEntry,
  pushRecentQuery,
  removeRecent,
  type RecentItem,
} from "../../lib/global-search-recents";

const DEBOUNCE_MS = 200;
const MIN_PANEL_WIDTH = 380;

const KIND_ICON: Record<SearchEntryKind, ComponentType<{ className?: string }>> = {
  note: StickyNote,
  board: LayoutDashboard,
  chalkboard: Palette,
  notebook: BookOpen,
  project: FolderOpen,
  event: Calendar,
};

const KIND_CHIPS: Array<{ value: SearchEntryKind | null; label: string }> = [
  { value: null, label: "All" },
  { value: "note", label: "Notes" },
  { value: "board", label: "Boards" },
  { value: "chalkboard", label: "Chalk" },
  { value: "notebook", label: "Notebooks" },
  { value: "project", label: "Projects" },
  { value: "event", label: "Events" },
];

const isMac =
  typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.userAgent);

interface PanelRow {
  index: number;
  domId: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  /** Second line: excerpt of note/card body around the match. */
  snippet?: string;
  onActivate: () => void;
  /** When set, the row shows a trailing "×" that runs this (used for recents). */
  onRemove?: () => void;
}

interface PanelSection {
  key: string;
  heading?: string;
  rows: PanelRow[];
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const { entries, status, isOpen, focusNonce, setOpen, close, ensureIndex, refresh } =
    useGlobalSearch();

  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<SearchEntryKind | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [dropdownStyle, setDropdownStyle] = useState<{ left: number; top: number } | null>(
    null,
  );
  const [panelWidth, setPanelWidth] = useState(MIN_PANEL_WIDTH);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rowElsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const listboxId = useId();
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);
  const trimmed = debouncedQuery.trim();

  const closePanel = useCallback(() => {
    close();
    setQuery("");
    setKindFilter(null);
    // Drop focus too — otherwise, after picking a result, the caret stays in the
    // (now panel-less) input and the user has to click out and back in.
    inputRef.current?.blur();
  }, [close]);

  const activateEntry = useCallback(
    (entry: SearchIndexEntry) => {
      pushRecentEntry(entry);
      if (trimmed) pushRecentQuery(trimmed);
      closePanel();
      navigate(entry.to);
    },
    [closePanel, navigate, trimmed],
  );

  const activateAction = useCallback(
    (action: QuickAction) => {
      closePanel();
      action.run(navigate);
    },
    [closePanel, navigate],
  );

  /* ── Section model (also flattened for keyboard nav) ──────────── */
  const { sections, flatRows } = useMemo(() => {
    const rawSections: Array<Omit<PanelSection, "rows"> & { rows: Omit<PanelRow, "index" | "domId">[] }> = [];
    const queryTokens = tokenize(debouncedQuery);

    if (!trimmed) {
      if (recents.length > 0) {
        rawSections.push({
          key: "recent",
          heading: "Recent",
          rows: recents.map((item) => {
            const onRemove = () => {
              removeRecent(item);
              setRecents(getRecents());
            };
            return item.type === "query"
              ? {
                  icon: Clock,
                  title: item.text,
                  onActivate: () => {
                    setQuery(item.text);
                    inputRef.current?.focus();
                  },
                  onRemove,
                }
              : {
                  icon: KIND_ICON[item.entry.kind],
                  title: item.entry.title,
                  subtitle: item.entry.subtitle,
                  onActivate: () => activateEntry(item.entry),
                  onRemove,
                };
          }),
        });
      }
      rawSections.push({
        key: "actions",
        heading: "Actions",
        rows: QUICK_ACTIONS.map((action) => ({
          icon: action.icon,
          title: action.label,
          onActivate: () => activateAction(action),
        })),
      });
    } else {
      const grouped = searchEntries(entries, debouncedQuery, { kind: kindFilter });
      for (const group of grouped.groups) {
        const more =
          group.total > group.entries.length
            ? `  ·  ${group.entries.length} of ${group.total}`
            : "";
        rawSections.push({
          key: group.kind,
          heading: `${group.label}${more}`,
          rows: group.entries.map((entry) => ({
            icon: KIND_ICON[entry.kind],
            title: entry.title,
            subtitle: entry.subtitle,
            snippet:
              entry.kind === "note" && entry.body
                ? buildSnippet(entry.body, queryTokens)
                : undefined,
            onActivate: () => activateEntry(entry),
          })),
        });
      }

      const actionMatches = kindFilter
        ? []
        : QUICK_ACTIONS.filter((action) =>
            matchesTokens(`${action.label} ${action.keywords}`, queryTokens),
          );
      if (actionMatches.length > 0) {
        rawSections.push({
          key: "actions",
          heading: "Actions",
          rows: actionMatches.map((action) => ({
            icon: action.icon,
            title: action.label,
            onActivate: () => activateAction(action),
          })),
        });
      }
    }

    let index = 0;
    const built: PanelSection[] = rawSections.map((section) => ({
      ...section,
      rows: section.rows.map((row) => ({
        ...row,
        index,
        domId: `${listboxId}-opt-${index++}`,
      })),
    }));

    return { sections: built, flatRows: built.flatMap((section) => section.rows) };
  }, [
    trimmed,
    debouncedQuery,
    recents,
    entries,
    kindFilter,
    listboxId,
    activateEntry,
    activateAction,
  ]);

  const hasRows = flatRows.length > 0;
  const activeRow = flatRows[activeIndex] ?? null;

  /* ── Reset / clamp the active row as results change ──────────── */
  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery, kindFilter, recents]);

  useEffect(() => {
    if (activeIndex > 0 && activeIndex >= flatRows.length) setActiveIndex(0);
  }, [flatRows.length, activeIndex]);

  useEffect(() => {
    rowElsRef.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, sections]);

  /* ── Load recents whenever the panel is (re)opened ──────────── */
  useEffect(() => {
    if (isOpen) setRecents(getRecents());
  }, [isOpen, focusNonce]);

  /* ── Focus the input on ⌘K / button request ──────────── */
  useEffect(() => {
    if (focusNonce > 0) inputRef.current?.focus();
  }, [focusNonce]);

  /* ── Position the fixed portal under the input ──────────── */
  const syncPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownStyle({ left: rect.left, top: rect.bottom + 6 });
    setPanelWidth(
      Math.min(Math.max(rect.width, MIN_PANEL_WIDTH), window.innerWidth - 16),
    );
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setDropdownStyle(null);
      return;
    }
    syncPosition();
  }, [isOpen, syncPosition]);

  useLayoutEffect(() => {
    if (!isOpen || !dropdownStyle || !panelRef.current) return;
    const el = panelRef.current;
    const fit = () => fitFixedDropdownToViewport(el, setDropdownStyle);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isOpen, dropdownStyle]);

  useEffect(() => {
    if (!isOpen) return;
    const onReposition = () => syncPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [isOpen, syncPosition]);

  /* ── Close on outside pointer ──────────── */
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      closePanel();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [isOpen, closePanel]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      closePanel();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hasRows) setActiveIndex((i) => (i + 1) % flatRows.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (hasRows) setActiveIndex((i) => (i - 1 + flatRows.length) % flatRows.length);
      return;
    }
    if (e.key === "Enter") {
      if (activeRow) {
        e.preventDefault();
        activeRow.onActivate();
      }
      return;
    }
    if (e.key === "Tab") {
      close();
    }
  }

  const showPanel = isOpen && dropdownStyle !== null;

  const emptyState = (() => {
    if (!trimmed) {
      return sections.length === 0 ? "Type to search your workspace" : null;
    }
    if (status === "error") return null;
    if (hasRows) return null;
    if (status === "loading" && entries.length === 0) return "Searching…";
    return `No results for “${trimmed}”`;
  })();

  return (
    <div ref={containerRef} className="relative w-full">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--land-ink-3)]"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Search your workspace"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeRow?.domId}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Search…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          ensureIndex();
        }}
        onKeyDown={handleKeyDown}
        className="h-9 w-full rounded-lg border border-[var(--land-rule)] bg-[var(--land-paper)] pl-9 pr-16 text-sm text-[var(--land-ink)] placeholder:text-[var(--land-ink-3)] transition-colors focus:border-[var(--land-ink-3)] focus:outline-none motion-reduce:transition-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
      />
      {query ? (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-[var(--land-ink-3)] hover:bg-[var(--land-cream)] hover:text-[var(--land-ink)]"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[var(--land-rule)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--land-ink-3)]">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      )}

      {showPanel &&
        createPortal(
          <div
            ref={panelRef}
            id={listboxId}
            role="listbox"
            aria-label="Search results"
            className="app-editorial fixed z-[99999] origin-top overflow-y-auto rounded-xl border border-[var(--land-rule)] bg-[var(--land-paper)] p-1.5 shadow-xl animate-menu-drop motion-reduce:animate-none"
            style={{
              left: dropdownStyle.left,
              top: dropdownStyle.top,
              width: panelWidth,
              maxHeight: "min(70vh, 32rem)",
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="flex flex-wrap gap-1 border-b border-[var(--land-rule)] px-1 pb-2 pt-1">
              {KIND_CHIPS.map((chip) => {
                const active = kindFilter === chip.value;
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setKindFilter(chip.value)}
                    className={`rounded-full px-2.5 py-1 text-xs transition-colors motion-reduce:transition-none ${
                      active
                        ? "bg-[var(--land-blue)] text-[var(--land-blue-fg)]"
                        : "text-[var(--land-ink-2)] hover:bg-[var(--land-cream)]"
                    }`}
                    aria-pressed={active}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {emptyState ? (
              <div className="px-3 py-6 text-center text-sm text-[var(--land-ink-3)]">
                {emptyState}
              </div>
            ) : status === "error" && trimmed ? (
              <div className="px-3 py-6 text-center text-sm text-[var(--land-ink-3)]">
                Couldn’t load search.{" "}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void refresh()}
                  className="font-medium text-[var(--land-blue)] hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="pt-1">
                {sections.map((section) => (
                  <div key={section.key} className="pb-1">
                    {section.heading && (
                      <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--land-ink-3)]">
                        {section.heading}
                      </div>
                    )}
                    {section.rows.map((row) => {
                      const RowIcon = row.icon;
                      const active = row.index === activeIndex;
                      return (
                        <div key={row.domId} className="group/row relative">
                          <button
                            id={row.domId}
                            ref={(el) => {
                              rowElsRef.current[row.index] = el;
                            }}
                            type="button"
                            role="option"
                            aria-selected={active}
                            onMouseEnter={() => setActiveIndex(row.index)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              row.onActivate();
                            }}
                            className={`flex w-full flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left motion-reduce:transition-none ${
                              row.onRemove ? "pr-8" : ""
                            } ${active ? "bg-[var(--land-cream)]" : ""}`}
                          >
                            <span className="flex w-full items-center gap-2.5 text-sm">
                              <RowIcon className="h-4 w-4 shrink-0 text-[var(--land-ink-3)]" />
                              <span className="min-w-0 flex-1 truncate text-[var(--land-ink)]">
                                {row.title}
                              </span>
                              {row.subtitle && (
                                <span className="max-w-[45%] shrink-0 truncate text-xs text-[var(--land-ink-3)]">
                                  {row.subtitle}
                                </span>
                              )}
                            </span>
                            {row.snippet && (
                              <span className="line-clamp-1 pl-[26px] text-xs text-[var(--land-ink-3)]">
                                {row.snippet}
                              </span>
                            )}
                          </button>
                          {row.onRemove && (
                            <button
                              type="button"
                              tabIndex={-1}
                              aria-label="Remove from recent"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                row.onRemove?.();
                              }}
                              className={`absolute right-1.5 top-1/2 h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-[var(--land-ink-3)] hover:bg-[var(--land-paper)] hover:text-[var(--land-ink)] ${
                                active ? "flex" : "hidden group-hover/row:flex"
                              }`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
