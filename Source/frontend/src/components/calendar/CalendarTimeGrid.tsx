import { useMemo, useState } from "react";
import type { CalendarEventDto } from "../../types";
import { resolveEventProjectName } from "../../utils/calendar-event-project-name";
import { resolveCalendarEventColor } from "../../utils/calendar-event-colors";

/* ─── Constants ────────────────────────────────────────── */

const HOUR_HEIGHT = 48; // px per hour row
const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/* ─── Date helpers ─────────────────────────────────────── */

/** Wall-clock time is stored in the UTC fields of the ISO string (see calendar-event-save.ts). */
function utcParts(iso: string) {
  const d = new Date(iso);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth(),
    d: d.getUTCDate(),
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function eventStartsOn(event: CalendarEventDto, day: Date): boolean {
  const s = utcParts(event.startDate);
  return s.y === day.getFullYear() && s.m === day.getMonth() && s.d === day.getDate();
}

/** True when an all-day / multi-day / holiday item covers `day`. */
function spansDay(event: CalendarEventDto, day: Date): boolean {
  const s = utcParts(event.startDate);
  const start = new Date(s.y, s.m, s.d).getTime();
  const e = event.endDate ? utcParts(event.endDate) : s;
  const end = new Date(e.y, e.m, e.d).getTime();
  const target = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  return target >= start && target <= end;
}

function isAllDayItem(event: CalendarEventDto): boolean {
  if (event.isAllDay || event.eventType === "Holiday") return true;
  // Multi-day timed events also live in the all-day strip.
  if (!event.endDate) return false;
  const s = utcParts(event.startDate);
  const e = utcParts(event.endDate);
  return s.y !== e.y || s.m !== e.m || s.d !== e.d;
}

function fmtHour(h: number): string {
  if (h === 0) return "";
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

function fmtClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, "0")}${period}`;
}

/* ─── Timed-event layout (side-by-side overlap) ────────── */

interface PositionedEvent {
  event: CalendarEventDto;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
  /** Stacking order — later columns sit on top so their card stays clickable. */
  z: number;
}

function layoutDay(events: CalendarEventDto[], day: Date): PositionedEvent[] {
  const timed = events
    .filter((e) => !isAllDayItem(e) && eventStartsOn(e, day))
    .map((e) => {
      const start = utcParts(e.startDate).minutes;
      const endParts = e.endDate ? utcParts(e.endDate) : null;
      const rawEnd = endParts ? endParts.minutes : start + 60;
      const end = Math.max(start + 15, Math.min(rawEnd, 24 * 60));
      return { event: e, start, end };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  // Greedily pack overlapping events into columns, then size each cluster.
  const result: PositionedEvent[] = [];
  let cluster: typeof timed = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const columns: (typeof timed)[] = [];
    for (const item of cluster) {
      let placed = false;
      for (const col of columns) {
        if (col[col.length - 1].end <= item.start) {
          col.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) columns.push([item]);
    }
    const colCount = columns.length;
    // Overlapping events cascade rather than shrinking to thin equal slivers:
    // each column keeps a readable width and is offset a fixed step from the
    // previous one, with later columns stacked on top.
    const widthPct =
      colCount === 1 ? 100 : Math.min(92, (100 / colCount) * 1.5);
    const stepPct =
      colCount > 1 ? (100 - widthPct) / (colCount - 1) : 0;
    columns.forEach((col, colIdx) => {
      for (const item of col) {
        result.push({
          event: item.event,
          top: (item.start / 60) * HOUR_HEIGHT,
          height: ((item.end - item.start) / 60) * HOUR_HEIGHT,
          leftPct: colIdx * stepPct,
          widthPct,
          z: 20 + colIdx,
        });
      }
    });
    cluster = [];
    clusterEnd = -1;
  };

  for (const item of timed) {
    if (cluster.length > 0 && item.start >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();

  return result;
}

/* ─── Component ────────────────────────────────────────── */

interface CalendarTimeGridProps {
  /** 1 day for the Day view, 7 for the Week view. */
  days: Date[];
  events: CalendarEventDto[];
  /** Clicking an empty time slot opens the create-event dialog on that day. */
  onClickDay: (date: Date) => void;
  /**
   * Clicking an empty spot in the all-day strip. Defaults to {@link onClickDay}
   * when omitted; pass a handler that opens the dialog pre-set to an all-day event.
   */
  onClickAllDay?: (date: Date) => void;
  /**
   * Clicking an empty hour cell in the time grid — `hour` is 0–23. Defaults to
   * {@link onClickDay} when omitted; pass a handler that opens the create dialog
   * pre-set to a timed item starting at that hour.
   */
  onClickTimeSlot?: (date: Date, hour: number) => void;
  onClickEvent: (event: CalendarEventDto) => void;
  /** Clicking a day header — used by the Week view to drill into the Day view. */
  onSelectDate?: (date: Date) => void;
  projectNameMap?: Record<string, string>;
  /**
   * Render the day-name / date-number header row. Defaults to `true`; the
   * dashboard sets it `false` because the panel already shows the date above the
   * grid, so the all-day strip becomes the grid's top row instead.
   */
  showDayHeader?: boolean;
}

export function CalendarTimeGrid({
  days,
  events,
  onClickDay,
  onClickAllDay,
  onClickTimeSlot,
  onClickEvent,
  onSelectDate,
  projectNameMap,
  showDayHeader = true,
}: CalendarTimeGridProps) {
  const today = useMemo(() => new Date(), []);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  // Hovered timed event — lifted above its neighbours and expanded to fill the
  // column so a cascaded card becomes fully readable on hover.
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const allDayByDay = useMemo(
    () => days.map((day) => events.filter((e) => isAllDayItem(e) && spansDay(e, day))),
    [days, events],
  );
  const positionedByDay = useMemo(
    () => days.map((day) => layoutDay(events, day)),
    [days, events],
  );

  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  return (
    <div className="flex flex-col overflow-hidden border border-border">
      {/* Day headers — hidden on the dashboard, which shows the date above the grid */}
      {showDayHeader && (
        <div className="flex border-b border-border">
          <div className="w-14 flex-shrink-0" />
          {days.map((day, i) => {
            const isToday = isSameDay(day, today);
            return (
              <button
                key={i}
                type="button"
                onClick={() =>
                  onSelectDate ? onSelectDate(day) : onClickDay(day)
                }
                className="flex flex-1 flex-col items-center gap-0.5 border-l border-border px-2 py-2 transition-colors hover:bg-[var(--land-cream,#f7f2e9)]"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
                  {DAY_LABELS[day.getDay()]}
                </span>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-md text-base font-semibold ${
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground"
                  }`}
                >
                  {day.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* All-day strip — always shown so an empty day is still a click target for
          creating an all-day event; holidays and multi-day items live here too. */}
      <div className="flex border-b border-border bg-foreground/[0.02]">
        <div className="flex w-14 flex-shrink-0 items-start justify-end py-1.5 pr-1.5 text-[10px] uppercase tracking-wide text-foreground/40">
          All-day
        </div>
        {days.map((day, i) => (
          <div
            key={i}
            onClick={() => (onClickAllDay ?? onClickDay)(day)}
            className="min-h-[1.75rem] flex-1 cursor-pointer space-y-0.5 border-l border-border p-1 transition-colors hover:bg-[var(--land-cream,#f7f2e9)] has-[button:hover]:!bg-transparent motion-reduce:transition-none"
          >
            {allDayByDay[i].map((event) => {
              const colors = resolveCalendarEventColor(event.color);
              const projectName = resolveEventProjectName(event, projectNameMap);
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClickEvent(event);
                  }}
                  className={`block w-full truncate rounded border px-1.5 py-0.5 text-left text-[11px] font-medium transition-shadow duration-150 hover:shadow-md hover:ring-1 hover:ring-black/10 motion-reduce:transition-none dark:hover:ring-white/20 ${colors.bg} ${colors.text} ${colors.border}`}
                  title={projectName ? `${projectName}: ${event.title}` : event.title}
                >
                  {event.eventType === "Holiday" && "🎉 "}
                  {projectName && <span className="opacity-70">{projectName}: </span>}
                  {event.title}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Hour grid — full height; the page scrollbar handles vertical scroll */}
      <div>
        <div className="flex" style={{ height: 24 * HOUR_HEIGHT }}>
          {/* Hour gutter */}
          <div className="w-14 flex-shrink-0">
            {hours.map((h) => (
              <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
                <span className="absolute -top-1.5 right-1.5 text-[10px] font-medium text-foreground/40">
                  {fmtHour(h)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIdx) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={dayIdx}
                className="relative flex-1 border-l border-border"
              >
                {hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() =>
                      onClickTimeSlot
                        ? onClickTimeSlot(day, h)
                        : onClickDay(day)
                    }
                    aria-label={`Add event at ${fmtHour(h) || "12 AM"} on ${day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}`}
                    // No hover tint while an event is hovered, so the grid behind
                    // the lifted card stays put.
                    className={`block w-full cursor-pointer border-b border-border/50 transition-colors motion-reduce:transition-none ${
                      hoveredId ? "" : "hover:bg-[var(--land-cream,#f7f2e9)]"
                    }`}
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {isToday && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                    style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
                  >
                    <span className="-ml-1 h-2 w-2 rounded-full bg-red-500" />
                    <span className="h-px flex-1 bg-red-500" />
                  </div>
                )}

                {positionedByDay[dayIdx].map((pos) => {
                  const colors = resolveCalendarEventColor(pos.event.color);
                  const projectName = resolveEventProjectName(
                    pos.event,
                    projectNameMap,
                  );
                  const startMin = utcParts(pos.event.startDate).minutes;
                  const isHovered = hoveredId === pos.event.id;
                  // On hover the card lifts above its neighbours and nudges up in
                  // size in place — it keeps its staggered column width rather
                  // than expanding to fill the day column.
                  return (
                    <button
                      key={pos.event.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClickEvent(pos.event);
                      }}
                      onMouseEnter={() => setHoveredId(pos.event.id)}
                      onMouseLeave={() =>
                        setHoveredId((cur) =>
                          cur === pos.event.id ? null : cur,
                        )
                      }
                      className={`absolute overflow-hidden rounded border px-1.5 py-0.5 text-left leading-tight ${colors.bg} ${colors.text} ${colors.border} transition-[box-shadow,transform] duration-150 motion-reduce:transition-none ${
                        isHovered
                          ? "scale-[1.015] shadow-lg ring-1 ring-black/10 dark:ring-white/20"
                          : ""
                      }`}
                      style={{
                        top: pos.top,
                        height: Math.max(pos.height, 16),
                        left: `calc(${pos.leftPct}% + 2px)`,
                        width: `calc(${pos.widthPct}% - 4px)`,
                        zIndex: isHovered ? 50 : pos.z,
                      }}
                      title={pos.event.title}
                    >
                      <span className="block truncate text-[11px] font-semibold">
                        {pos.event.eventType === "Note" && "📝 "}
                        {projectName && (
                          <span className="opacity-70">{projectName}: </span>
                        )}
                        {pos.event.title}
                      </span>
                      {pos.height >= 28 && (
                        <span className="block truncate text-[10px] opacity-70">
                          {fmtClock(startMin)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
