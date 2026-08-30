import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Filter, X } from "lucide-react";
import { AnimatedCheckbox } from "../ui/AnimatedCheckbox";
import {
  constrainFixedBox,
  DROPDOWN_VIEWPORT_PADDING,
} from "../../lib/dropdown-viewport";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  isDefaultFilterState,
} from "../../lib/gallery-prefs";
import {
  GALLERY_KIND_LABELS,
  GALLERY_KIND_ORDER,
} from "../../lib/gallery-filter";
import type {
  GalleryFilterState,
  GalleryProjectStatus,
} from "../../types/gallery";

const STATUSES: GalleryProjectStatus[] = ["Active", "Completed", "Archived"];

const CLEARED_FILTERS: GalleryFilterState = {
  kinds: [],
  projectStatuses: [],
  ownership: [],
  pinnedOnly: false,
  recentWithinDays: null,
};

const OWNERSHIP: Array<{ value: "owned" | "shared"; label: string }> = [
  { value: "owned", label: "Owned by me" },
  { value: "shared", label: "Shared with me" },
];

const RECENT_OPTIONS: Array<{ value: 1 | 7 | 30 | null; label: string }> = [
  { value: null, label: "Any time" },
  { value: 1, label: "Last 24 hours" },
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((entry) => entry !== value)
    : [...list, value];
}

interface CheckRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CheckRow({ label, checked, onChange }: CheckRowProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-foreground/80"
    >
      <AnimatedCheckbox id={id} checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}

interface GalleryFilterPanelProps {
  filters: GalleryFilterState;
  onChange: (next: GalleryFilterState) => void;
  matchCount: number;
  totalCount: number;
}

export function GalleryFilterPanel({
  filters,
  onChange,
  matchCount,
  totalCount,
}: GalleryFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const activeCount = activeFilterCount(filters);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        wrapperRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      )
        return;
      setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // The panel is portalled to `document.body` so a horizontally-scrolling
  // toolbar can't clip it; keep it pinned under the trigger — on open, and on
  // any scroll / resize while open (otherwise it detaches as the page moves).
  const reposition = useCallback(() => {
    const trigger = wrapperRef.current?.getBoundingClientRect();
    if (!trigger) return;
    // Trigger scrolled out of view — dismiss rather than float detached.
    if (trigger.bottom < 0 || trigger.top > window.innerHeight) {
      setOpen(false);
      return;
    }
    const PANEL_WIDTH = 288; // w-72
    const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 400;
    const next = constrainFixedBox(
      trigger.right - PANEL_WIDTH,
      trigger.bottom + 8,
      PANEL_WIDTH,
      panelHeight,
      DROPDOWN_VIEWPORT_PADDING,
    );
    setPos((prev) =>
      prev && prev.left === next.left && prev.top === next.top ? prev : next,
    );
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    reposition();
    // capture=true so it catches scrolls from any nested scroll container.
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
          activeCount > 0
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-background text-foreground/60 hover:text-foreground"
        }`}
      >
        <Filter className="h-3.5 w-3.5" />
        Filter
        {activeCount > 0 && (
          <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-semibold text-primary-foreground">
            {activeCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          // `app-editorial` re-scopes the --land-* vars AnimatedCheckbox needs —
          // the portal renders outside AppLayout's own editorial scope.
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              left: pos?.left ?? -9999,
              top: pos?.top ?? -9999,
              visibility: pos ? "visible" : "hidden",
            }}
            className="app-editorial z-50 w-72 rounded-xl border border-border bg-background p-4 shadow-xl animate-dropdown-pop motion-reduce:animate-none"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                Filters
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-0.5 text-foreground/40 hover:bg-foreground/5 hover:text-foreground"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <fieldset>
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/40">
                  Content type
                </legend>
                {GALLERY_KIND_ORDER.map((kind) => (
                  <CheckRow
                    key={kind}
                    label={GALLERY_KIND_LABELS[kind]}
                    checked={filters.kinds.includes(kind)}
                    onChange={() =>
                      onChange({
                        ...filters,
                        kinds: toggle(filters.kinds, kind),
                      })
                    }
                  />
                ))}
              </fieldset>

              <fieldset className="border-t border-border/60 pt-2">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/40">
                  Project status
                </legend>
                {STATUSES.map((status) => (
                  <CheckRow
                    key={status}
                    label={status}
                    checked={filters.projectStatuses.includes(status)}
                    onChange={() =>
                      onChange({
                        ...filters,
                        projectStatuses: toggle(
                          filters.projectStatuses,
                          status,
                        ),
                      })
                    }
                  />
                ))}
              </fieldset>

              <fieldset className="border-t border-border/60 pt-2">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/40">
                  Ownership
                </legend>
                {OWNERSHIP.map((option) => (
                  <CheckRow
                    key={option.value}
                    label={option.label}
                    checked={filters.ownership.includes(option.value)}
                    onChange={() =>
                      onChange({
                        ...filters,
                        ownership: toggle(filters.ownership, option.value),
                      })
                    }
                  />
                ))}
              </fieldset>

              <div className="border-t border-border/60 pt-2">
                <CheckRow
                  label="Pinned only"
                  checked={filters.pinnedOnly}
                  onChange={(checked) =>
                    onChange({ ...filters, pinnedOnly: checked })
                  }
                />
              </div>

              <fieldset className="border-t border-border/60 pt-2">
                <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/40">
                  Recently edited
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {RECENT_OPTIONS.map((option) => {
                    const active = filters.recentWithinDays === option.value;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() =>
                          onChange({
                            ...filters,
                            recentWithinDays: option.value,
                          })
                        }
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface text-foreground/60 hover:text-foreground"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-foreground/50">
              <span>
                Showing {matchCount} of {totalCount}
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange(
                    isDefaultFilterState(filters)
                      ? { ...CLEARED_FILTERS }
                      : { ...DEFAULT_FILTERS },
                  )
                }
                className="font-medium text-primary hover:underline"
              >
                {isDefaultFilterState(filters) ? "Unselect all" : "Select all"}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
