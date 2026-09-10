import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { useRovingFocus } from "../../hooks/useRovingFocus";

export type CalendarView = "day" | "week" | "month" | "year" | "events";

const CALENDAR_VIEW_LABELS: Record<CalendarView, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  year: "Year",
  events: "Events",
};

const VIEW_OPTIONS: Array<{ value: CalendarView; hint: string }> = [
  { value: "day", hint: "D" },
  { value: "week", hint: "W" },
  { value: "month", hint: "M" },
  { value: "year", hint: "Y" },
  { value: "events", hint: "A" },
];

const MENU_WIDTH = 176; // w-44

interface CalendarViewMenuProps {
  value: CalendarView;
  onChange: (view: CalendarView) => void;
}

/**
 * Google Calendar-style view switcher — a single "Month ▾" button that opens a
 * dropdown of Day / Week / Month / Year / Events. The panel renders in a portal
 * so the header's horizontal scroll container can't clip it.
 */
export function CalendarViewMenu({ value, onChange }: CalendarViewMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useRovingFocus(menuRef, {
    active: open,
    onTabOut: () => setOpen(false),
  });

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const left = Math.max(
        8,
        Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8),
      );
      setCoords({ top: rect.bottom + 4, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="flex-shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        {CALENDAR_VIEW_LABELS[value]}
        <ChevronDown className="h-3.5 w-3.5 text-foreground/40" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            tabIndex={-1}
            aria-label="Calendar view"
            style={{ position: "fixed", top: coords.top, left: coords.left, width: MENU_WIDTH }}
            className="z-50 origin-top-right animate-dropdown-pop overflow-hidden rounded-lg border border-border bg-background py-1 shadow-lg motion-reduce:animate-none"
          >
            {VIEW_OPTIONS.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitemradio"
                  tabIndex={-1}
                  aria-checked={active}
                  onClick={() => {
                    setOpen(false);
                    onChange(opt.value);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-foreground/5 ${
                    active ? "text-foreground" : "text-foreground/70"
                  }`}
                >
                  <Check
                    className={`h-3.5 w-3.5 text-primary ${active ? "opacity-100" : "opacity-0"}`}
                  />
                  <span className="flex-1">{CALENDAR_VIEW_LABELS[opt.value]}</span>
                  <span className="text-[10px] font-semibold text-foreground/30">
                    {opt.hint}
                  </span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
