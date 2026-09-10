import { Plus } from "lucide-react";
import type { CalendarEventDto, ProjectSummaryDto } from "../../types";
import { resolveEventProjectName } from "../../utils/calendar-event-project-name";
import { CalendarEventItem } from "./CalendarEventItem";
import { CalendarProjectBar } from "./CalendarProjectBar";

interface CalendarDayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEventDto[];
  projects: ProjectSummaryDto[];
  onClickDay: (date: Date) => void;
  /** Drill into a focused view for the date (month view → day view). Falls back to {@link onClickDay}. */
  onSelectDate?: (date: Date) => void;
  onClickEvent: (event: CalendarEventDto) => void;
  onClickProject?: (project: ProjectSummaryDto) => void;
  compact?: boolean;
  /** Map of projectId -> project name for displaying on events */
  projectNameMap?: Record<string, string>;
}

export function CalendarDayCell({
  date,
  isCurrentMonth,
  isToday,
  events,
  projects,
  onClickDay,
  onSelectDate,
  onClickEvent,
  onClickProject,
  compact,
  projectNameMap,
}: CalendarDayCellProps) {
  const dayNumber = date.getDate();
  const openDay = onSelectDate ?? onClickDay;
  const maxItems = compact ? 0 : 3;
  const visibleEvents = events.slice(0, maxItems);
  const visibleProjects = projects.slice(0, Math.max(0, maxItems - visibleEvents.length));
  const overflow =
    events.length + projects.length - visibleEvents.length - visibleProjects.length;

  if (compact) {
    const allDots = [...events.map((e) => e.color), ...projects.map((p) => p.color || "violet")];
    return (
      <button
        type="button"
        onClick={() => onClickDay(date)}
        className={`navbar-day-cell flex flex-col items-center gap-0.5 px-1 py-1.5 transition-colors hover:brightness-[0.97] dark:hover:brightness-110 ${
          !isCurrentMonth ? "opacity-40" : ""
        }`}
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
            isToday
              ? "bg-primary text-primary-foreground"
              : "text-foreground/70"
          }`}
        >
          {dayNumber}
        </span>
        {allDots.length > 0 && (
          <div className="flex gap-0.5">
            {allDots.slice(0, 3).map((c, i) => (
              <CalendarEventItem
                key={i}
                event={{ color: c } as CalendarEventDto}
                compact
              />
            ))}
          </div>
        )}
      </button>
    );
  }

  const dayLabel = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openDay(date)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDay(date);
        }
      }}
      aria-label={`View ${dayLabel}`}
      className={`group relative flex h-full min-h-0 min-w-0 cursor-pointer flex-col overflow-hidden border-b border-r border-border bg-background p-1.5 transition-colors hover:bg-[var(--land-cream,#f7f2e9)] ${
        !isCurrentMonth ? "opacity-40" : ""
      }`}
    >
      {/* Day number + add button */}
      <div className="mb-1 flex shrink-0 items-center justify-between">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold ${
            isToday
              ? "bg-primary text-primary-foreground"
              : "text-foreground/70"
          }`}
        >
          {dayNumber}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClickDay(date);
          }}
          className="flex h-5 w-5 items-center justify-center rounded-md text-foreground/20 opacity-0 transition-[colors,opacity] duration-150 hover:bg-foreground/5 hover:text-foreground/50 group-hover:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none"
          title="Add event"
          aria-label={`Add event on ${dayLabel}`}
        >
          <Plus className="h-3 w-3" aria-hidden />
        </button>
      </div>

      {/* Project bars */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
        {visibleProjects.map((project) => (
          <CalendarProjectBar
            key={project.id}
            project={project}
            onClick={onClickProject}
          />
        ))}
      </div>

      {/* Events */}
      <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
        {visibleEvents.map((event) => (
          <CalendarEventItem
            key={event.id}
            event={event}
            onClick={onClickEvent}
            projectName={resolveEventProjectName(event, projectNameMap)}
          />
        ))}
      </div>

      {/* Overflow */}
      {overflow > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openDay(date);
          }}
          className="mt-0.5 text-left text-[11px] font-medium text-foreground/50 hover:text-foreground"
        >
          +{overflow} more
        </button>
      )}
    </div>
  );
}
