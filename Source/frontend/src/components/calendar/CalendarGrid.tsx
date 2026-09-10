import { useMemo } from "react";
import type { CalendarEventDto, ProjectSummaryDto } from "../../types";
import { CalendarDayCell } from "./CalendarDayCell";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarGridProps {
  currentDate: Date;
  events: CalendarEventDto[];
  projects: ProjectSummaryDto[];
  onClickDay: (date: Date) => void;
  /** Drill into a focused view for the date (month view → day view). */
  onSelectDate?: (date: Date) => void;
  onClickEvent: (event: CalendarEventDto) => void;
  onClickProject?: (project: ProjectSummaryDto) => void;
  /** Map of projectId -> project name for displaying on events */
  projectNameMap?: Record<string, string>;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Same calendar day as project timelines: local date from the ISO instant (not UTC day). */
function parseServerDate(isoStr: string): Date {
  const d = new Date(isoStr);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Normalize a Date to local midnight (strips time component) */
function toLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dateInRange(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return d >= s && d <= e;
}

function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days: Date[] = [];

  // Fill in days from previous month to start on Sunday
  const startDay = firstDay.getDay();
  for (let i = startDay - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // Days of current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Fill remainder to complete the grid (6 rows)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

export function CalendarGrid({
  currentDate,
  events,
  projects,
  onClickDay,
  onSelectDate,
  onClickEvent,
  onClickProject,
  projectNameMap,
}: CalendarGridProps) {
  const today = useMemo(() => new Date(), []);
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const days = useMemo(() => getCalendarDays(year, month), [year, month]);

  function getEventsForDay(date: Date): CalendarEventDto[] {
    return events.filter((event) => {
      const start = parseServerDate(event.startDate);
      const end = event.endDate ? parseServerDate(event.endDate) : start;
      return dateInRange(date, start, end);
    });
  }

  function getProjectsForDay(date: Date): ProjectSummaryDto[] {
    return projects.filter((project) => {
      if (!project.startDate || !project.endDate) return false;
      const start = toLocalMidnight(new Date(project.startDate));
      const end = toLocalMidnight(new Date(project.endDate));
      return dateInRange(date, start, end);
    });
  }

  return (
    <div className="flex flex-col overflow-hidden border border-border">
      {/* Weekday headers — same type + surface as the day/week time grid */}
      <div className="grid shrink-0 grid-cols-7 border-b border-border bg-foreground/[0.02]">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="border-r border-border px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-foreground/50"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 auto-rows-[minmax(7rem,1fr)]">
        {days.map((date, index) => (
          <CalendarDayCell
            key={index}
            date={date}
            isCurrentMonth={date.getMonth() === month}
            isToday={isSameDay(date, today)}
            events={getEventsForDay(date)}
            projects={getProjectsForDay(date)}
            onClickDay={onClickDay}
            onSelectDate={onSelectDate}
            onClickEvent={onClickEvent}
            onClickProject={onClickProject}
            projectNameMap={projectNameMap}
          />
        ))}
      </div>
    </div>
  );
}
