import { useMemo } from "react";
import { CalendarX } from "lucide-react";
import type { CalendarEventDto } from "../../types";
import { resolveEventProjectName } from "../../utils/calendar-event-project-name";

const WEEKDAY_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

const DOT_COLOR: Record<string, string> = {
  sky: "bg-sky-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  emerald: "bg-emerald-400",
  violet: "bg-violet-400",
  orange: "bg-orange-400",
  holiday: "bg-red-400",
};

/** Wall-clock date/time is stored in the UTC fields (see calendar-event-save.ts). */
function utc(iso: string) {
  const d = new Date(iso);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth(),
    d: d.getUTCDate(),
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}

function fmtClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

interface AgendaGroup {
  key: string;
  date: Date;
  items: CalendarEventDto[];
}

interface CalendarAgendaViewProps {
  events: CalendarEventDto[];
  /** Only events on or after this day are listed. */
  fromDate: Date;
  onClickEvent: (event: CalendarEventDto) => void;
  projectNameMap?: Record<string, string>;
}

export function CalendarAgendaView({
  events,
  fromDate,
  onClickEvent,
  projectNameMap,
}: CalendarAgendaViewProps) {
  const groups = useMemo<AgendaGroup[]>(() => {
    const floor = new Date(
      fromDate.getFullYear(),
      fromDate.getMonth(),
      fromDate.getDate(),
    ).getTime();

    const map = new Map<string, AgendaGroup>();
    for (const event of events) {
      const s = utc(event.startDate);
      const dayStart = new Date(s.y, s.m, s.d).getTime();
      if (dayStart < floor) continue;
      const key = `${s.y}-${s.m}-${s.d}`;
      let group = map.get(key);
      if (!group) {
        group = { key, date: new Date(s.y, s.m, s.d), items: [] };
        map.set(key, group);
      }
      group.items.push(event);
    }

    return [...map.values()]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((g) => ({
        ...g,
        items: g.items.sort(
          (a, b) =>
            Number(b.isAllDay) - Number(a.isAllDay) ||
            utc(a.startDate).minutes - utc(b.startDate).minutes,
        ),
      }));
  }, [events, fromDate]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border border-border py-20 text-center">
        <CalendarX className="mb-3 h-6 w-6 text-foreground/30" />
        <p className="text-sm text-foreground/50">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="border border-border">
      {groups.map((group) => {
        const isToday =
          new Date().toDateString() === group.date.toDateString();
        return (
          <div key={group.key} className="flex border-b border-border last:border-b-0">
            {/* Date gutter */}
            <div className="flex w-24 flex-shrink-0 flex-col items-center border-r border-border py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/40">
                {MONTH_SHORT[group.date.getMonth()]}
              </span>
              <span
                className={`text-2xl font-bold ${
                  isToday ? "text-primary" : "text-foreground"
                }`}
              >
                {group.date.getDate()}
              </span>
              <span className="text-[11px] font-medium text-foreground/40">
                {WEEKDAY_SHORT[group.date.getDay()]}
              </span>
            </div>

            {/* Events */}
            <div className="min-w-0 flex-1 divide-y divide-border/60">
              {group.items.map((event) => {
                const dot = DOT_COLOR[event.color] ?? DOT_COLOR.sky;
                const projectName = resolveEventProjectName(
                  event,
                  projectNameMap,
                );
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onClickEvent(event)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-foreground/5"
                  >
                    <span
                      className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dot}`}
                    />
                    <span className="w-28 flex-shrink-0 text-xs font-medium text-foreground/50">
                      {event.isAllDay || event.eventType === "Holiday"
                        ? "All day"
                        : fmtClock(utc(event.startDate).minutes)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {event.eventType === "Note" && "📝 "}
                      {event.eventType === "Holiday" && "🎉 "}
                      {projectName && (
                        <span className="text-foreground/50">
                          {projectName}:{" "}
                        </span>
                      )}
                      {event.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
