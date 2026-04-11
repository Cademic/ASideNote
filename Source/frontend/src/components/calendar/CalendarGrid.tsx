import { useMemo } from "react";
import type { CalendarEventDto, ProjectSummaryDto } from "../../types";
import { CalendarDayCell } from "./CalendarDayCell";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarGridProps {
  currentDate: Date;
  events: CalendarEventDto[];
  projects: ProjectSummaryDto[];
  onClickDay: (date: Date) => void;
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
    <div className="overflow-hidden rounded-lg border border-border">
      {/* Weekday headers */}
      <div className="calendar-day-cell grid grid-cols-7 divide-x divide-border/40 border-b border-border">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-foreground/50"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((date, index) => (
          <CalendarDayCell
            key={index}
            date={date}
            isCurrentMonth={date.getMonth() === month}
            isToday={isSameDay(date, today)}
            events={getEventsForDay(date)}
            projects={getProjectsForDay(date)}
            onClickDay={onClickDay}
            onClickEvent={onClickEvent}
            onClickProject={onClickProject}
            projectNameMap={projectNameMap}
          />
        ))}
      </div>
    </div>
  );
}
