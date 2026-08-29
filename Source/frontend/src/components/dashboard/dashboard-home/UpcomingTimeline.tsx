import { useEffect, useMemo, useRef } from "react";
import type { UpcomingItem } from "../../../utils/dashboard-upcoming";
import { resolveCalendarEventColor } from "../../../utils/calendar-event-colors";

interface UpcomingTimelineProps {
  items: UpcomingItem[];
  /** UTC-midnight Date of the day being shown — the grid renders this day's 24 hours only. */
  viewDate: Date;
  onOpen: (item: UpcomingItem) => void;
}

const HOUR_HEIGHT = 48; // px per hour — matches Google Calendar's mobile day view density
const GUTTER = 52; // px — time-label column width
const MIN_EVENT_HEIGHT = 22;
const DAY_MS = 86_400_000;
const DEFAULT_EVENT_MINUTES = 60;
const FALLBACK_SCROLL_HOUR = 8; // where to park the scroll on a day that isn't "today"
const STAGGER_PX = 14; // horizontal + vertical inset per nesting level
const MAX_STAGGER = 6; // cap so deep stacks don't march off the panel

interface PositionedEvent {
  item: UpcomingItem;
  top: number;
  height: number;
  startLabel: string;
  /** Nesting depth: 0 = outermost; each overlapping/contained event insets one more level. */
  depth: number;
}

/**
 * The calendar feature stores the user's picked wall-clock time as UTC (an event created at
 * "6:00 PM" is persisted as `...T18:00:00Z` and read back with `getUTCHours()` — see
 * `CalendarEventItem.shortTime`). Event positions therefore come from UTC fields, but that
 * clock IS the user's local wall clock — so "today" and the red now-line are taken from the
 * viewer's LOCAL date/time, and a day is the UTC-midnight epoch of that local calendar date.
 */
function localTodayStartMs(): number {
  const n = new Date();
  return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
}

function hourLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${hour < 12 ? "AM" : "PM"}`;
}

function timeLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

/** Clamp `ms` to a minutes-into-day offset in the 0..24h range. */
function minutesIntoDay(ms: number, dayStartMs: number): number {
  return Math.max(0, Math.min(DAY_MS, ms - dayStartMs)) / 60_000;
}

/**
 * Cascade overlapping events instead of splitting the width: an event that starts while an
 * earlier one is still running (or sits entirely inside it) is inset one more level — nudged
 * down and to the right — so it reads as stacked/nested, like a deck of cards.
 */
function assignDepth(blocks: Omit<PositionedEvent, "depth">[]): PositionedEvent[] {
  const sorted = [...blocks].sort((a, b) => a.top - b.top || b.height - a.height);
  const depths: number[] = [];
  return sorted.map((block, i) => {
    let depth = 0;
    for (let j = 0; j < i; j++) {
      const prev = sorted[j];
      const prevRunsInto = prev.top + prev.height > block.top + 0.5;
      if (prevRunsInto) depth = Math.max(depth, depths[j] + 1);
    }
    depths[i] = depth;
    return { ...block, depth };
  });
}

export function UpcomingTimeline({ items, viewDate, onOpen }: UpcomingTimelineProps) {
  const scrollTargetRef = useRef<HTMLDivElement>(null);
  const dayStartMs = viewDate.getTime();
  const dayEndMs = dayStartMs + DAY_MS;
  const isViewingToday = dayStartMs === localTodayStartMs();

  const { allDay, positioned } = useMemo(() => {
    const allDayItems: UpcomingItem[] = [];
    const raw: Omit<PositionedEvent, "depth">[] = [];

    for (const item of items) {
      const ev = item.event;
      const startMs = item.startMs;
      const endMs = ev?.endDate
        ? new Date(ev.endDate).getTime()
        : startMs + DEFAULT_EVENT_MINUTES * 60_000;

      // Keep only items that intersect the day being shown.
      if (endMs <= dayStartMs || startMs >= dayEndMs) continue;

      if (item.project || ev?.isAllDay) {
        allDayItems.push(item);
        continue;
      }

      // Clamp to the visible day so a multi-hour (or multi-day) event spans every hour it covers.
      const startMin = minutesIntoDay(startMs, dayStartMs);
      const endMin = minutesIntoDay(endMs, dayStartMs);
      raw.push({
        item,
        top: (startMin / 60) * HOUR_HEIGHT,
        height: Math.max(MIN_EVENT_HEIGHT, ((endMin - startMin) / 60) * HOUR_HEIGHT),
        startLabel: timeLabel(startMs),
      });
    }

    const laid = assignDepth(raw).sort((a, b) => a.top - b.top || a.depth - b.depth);
    return { allDay: allDayItems, positioned: laid };
  }, [items, dayStartMs, dayEndMs]);

  // Red now-line: the viewer's LOCAL wall-clock time (the same clock the hour rows use).
  const localNow = new Date();
  const nowTop = ((localNow.getHours() * 60 + localNow.getMinutes()) / 60) * HOUR_HEIGHT;
  const scrollAnchorTop = isViewingToday ? nowTop : FALLBACK_SCROLL_HOUR * HOUR_HEIGHT;
  const isEmpty = allDay.length === 0 && positioned.length === 0;

  // Re-park the scroll whenever the day changes: to "now" on today, to the morning otherwise.
  useEffect(() => {
    scrollTargetRef.current?.scrollIntoView({ block: "center" });
  }, [dayStartMs]);

  return (
    <div className="flex flex-col">
      {allDay.length > 0 && (
        <div className="sticky top-0 z-30 mb-2 flex flex-col gap-1 border-b border-[var(--land-rule)] bg-[var(--land-paper)] pb-2">
          {allDay.map((item, i) => {
            const dot = item.event
              ? resolveCalendarEventColor(item.event.color).dot
              : "bg-[var(--land-amber)]";
            return (
              <button
                key={item.event?.id ?? item.project?.id ?? i}
                type="button"
                onClick={() => onOpen(item)}
                className="flex items-center gap-2 rounded px-1 py-1 text-left transition-colors hover:bg-[var(--land-cream)]"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
                <span className="w-12 shrink-0 font-label text-[10px] uppercase tracking-wide text-[var(--land-ink-3)]">
                  {item.project ? "Project" : "All day"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--land-ink)]">
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isEmpty && (
        <p className="px-1 pb-2 text-sm text-[var(--land-ink-3)]">
          Nothing scheduled {isViewingToday ? "today" : "this day"}.
        </p>
      )}

      <div className="relative" style={{ height: 24 * HOUR_HEIGHT }}>
        {/* Hour grid */}
        {Array.from({ length: 24 }, (_, hour) => (
          <div
            key={hour}
            className="absolute inset-x-0 border-t border-[var(--land-rule)]"
            style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          >
            <span
              className="absolute -top-2 left-0 font-label text-[11px] text-[var(--land-ink-3)]"
              style={{ width: GUTTER - 8 }}
            >
              {hour === 0 ? "" : hourLabel(hour)}
            </span>
          </div>
        ))}

        {/* Vertical rule between the time gutter and the events */}
        <div
          className="absolute inset-y-0 border-l border-[var(--land-rule)]"
          style={{ left: GUTTER }}
        />

        {/* Scroll anchor */}
        <div
          ref={scrollTargetRef}
          className="absolute h-px w-px"
          style={{ top: scrollAnchorTop }}
          aria-hidden
        />

        {/* Current-time indicator — only when the shown day is actually today */}
        {isViewingToday && (
          <div className="absolute inset-x-0 z-20" style={{ top: nowTop }} data-now aria-hidden>
            <div
              className="absolute h-2 w-2 -translate-y-1/2 rounded-full bg-[#ea4335]"
              style={{ left: GUTTER - 4 }}
            />
            <div
              className="absolute right-1 -translate-y-1/2 border-t-2 border-[#ea4335]"
              style={{ left: GUTTER }}
            />
          </div>
        )}

        {/* Events — positioned inside the area to the right of the time gutter */}
        <div className="absolute inset-y-0 right-0" style={{ left: GUTTER }}>
          {positioned.map(({ item, top, height, startLabel, depth }, i) => {
            const colors = resolveCalendarEventColor(item.event?.color);
            const inset = Math.min(depth, MAX_STAGGER) * STAGGER_PX;
            return (
              <button
                key={item.event?.id ?? i}
                type="button"
                onClick={() => onOpen(item)}
                title={item.title}
                className={`absolute flex flex-col overflow-hidden rounded-md border border-black/10 px-2 py-1 text-left shadow-sm transition-transform duration-150 ease-out hover:translate-x-1 motion-reduce:transition-none motion-reduce:hover:translate-x-0 dark:border-white/15 ${colors.bg} ${colors.text}`}
                style={{
                  top: top + inset,
                  height,
                  left: inset + 4,
                  right: 6,
                  zIndex: 10 + Math.min(depth, MAX_STAGGER),
                }}
              >
                <span className="truncate text-xs font-semibold leading-tight">
                  {item.event?.eventType === "Note" && "📝 "}
                  {item.title}
                </span>
                {height > 34 && (
                  <span className="truncate text-[11px] leading-tight opacity-70">{startLabel}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
