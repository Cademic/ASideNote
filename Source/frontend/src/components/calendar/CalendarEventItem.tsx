import type { CalendarEventDto } from "../../types";
import { resolveCalendarEventColor } from "../../utils/calendar-event-colors";

/** Compact clock label (e.g. "9:05a") for timed events shown in a dense grid cell. */
function shortTime(isoStr: string): string {
  const d = new Date(isoStr);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const mm = minutes === 0 ? "" : `:${String(minutes).padStart(2, "0")}`;
  return `${h12}${mm}${hours < 12 ? "a" : "p"}`;
}

interface CalendarEventItemProps {
  event: CalendarEventDto;
  onClick?: (event: CalendarEventDto) => void;
  compact?: boolean;
  projectName?: string | null;
}

export function CalendarEventItem({ event, onClick, compact, projectName }: CalendarEventItemProps) {
  const colors = resolveCalendarEventColor(event.color);
  const displayTitle = projectName ? `${projectName}: ${event.title}` : event.title;
  const timeLabel = !event.isAllDay && event.startDate ? shortTime(event.startDate) : null;

  if (compact) {
    return (
      <div
        className={`h-1.5 w-1.5 rounded-full ${colors.dot}`}
        title={displayTitle}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(event);
      }}
      className={`w-full min-w-0 overflow-hidden rounded border px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight transition-opacity hover:opacity-80 ${colors.bg} ${colors.text} ${colors.border}`}
      title={displayTitle}
    >
      <span className="block min-w-0 truncate">
        {event.eventType === "Note" && "📝 "}
        {event.eventType === "Holiday" && "🎉 "}
        {timeLabel && <span className="opacity-60">{timeLabel} </span>}
        {projectName && (
          <span className="opacity-60">{projectName}: </span>
        )}
        {event.title}
      </span>
    </button>
  );
}
