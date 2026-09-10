import { useMemo } from "react";
import type { CalendarEventDto, ProjectSummaryDto } from "../../types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

function dayKey(y: number, m: number, d: number): string {
  return `${y}-${m}-${d}`;
}

/** Wall-clock date is stored in the UTC fields (see calendar-event-save.ts). */
function utcDayKey(iso: string): string {
  const d = new Date(iso);
  return dayKey(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

interface CalendarYearViewProps {
  year: number;
  events: CalendarEventDto[];
  projects: ProjectSummaryDto[];
  /** Jump to the Month view focused on this date. */
  onSelectDate: (date: Date) => void;
}

export function CalendarYearView({
  year,
  events,
  projects,
  onSelectDate,
}: CalendarYearViewProps) {
  const today = useMemo(() => new Date(), []);

  // Set of "y-m-d" keys that have at least one event or an active project.
  const markedDays = useMemo(() => {
    const set = new Set<string>();
    for (const event of events) {
      set.add(utcDayKey(event.startDate));
      if (event.endDate) set.add(utcDayKey(event.endDate));
    }
    for (const p of projects) {
      if (!p.startDate) continue;
      const s = new Date(p.startDate);
      set.add(dayKey(s.getFullYear(), s.getMonth(), s.getDate()));
    }
    return set;
  }, [events, projects]);

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, month) => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells: (number | null)[] = [
          ...Array.from({ length: firstDay }, () => null),
          ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
        ];

        return (
          <div key={month}>
            <button
              type="button"
              onClick={() => onSelectDate(new Date(year, month, 1))}
              className="mb-1.5 text-sm font-semibold text-foreground transition-colors hover:text-primary"
            >
              {MONTH_NAMES[month]}
            </button>
            <div className="grid grid-cols-7 gap-y-0.5 text-center">
              {WEEKDAY_INITIALS.map((w, i) => (
                <span
                  key={i}
                  className="py-0.5 text-[10px] font-semibold text-foreground/35"
                >
                  {w}
                </span>
              ))}
              {cells.map((day, i) => {
                if (day === null) return <span key={i} />;
                const isToday =
                  today.getFullYear() === year &&
                  today.getMonth() === month &&
                  today.getDate() === day;
                const marked = markedDays.has(dayKey(year, month, day));
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSelectDate(new Date(year, month, day))}
                    className={`relative mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition-colors hover:bg-foreground/10 ${
                      isToday
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "text-foreground/70"
                    }`}
                  >
                    {day}
                    {marked && !isToday && (
                      <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-sky-400" />
                    )}
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
