import type { CalendarEventDto } from "../../types";

const COLOR_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  sky: { bg: "bg-sky-100 dark:bg-sky-900", text: "text-sky-700 dark:text-sky-100", dot: "bg-sky-400" },
  amber: { bg: "bg-amber-100 dark:bg-amber-900", text: "text-amber-700 dark:text-amber-100", dot: "bg-amber-400" },
  rose: { bg: "bg-rose-100 dark:bg-rose-900", text: "text-rose-700 dark:text-rose-100", dot: "bg-rose-400" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-900", text: "text-emerald-700 dark:text-emerald-100", dot: "bg-emerald-400" },
  violet: { bg: "bg-violet-100 dark:bg-violet-900", text: "text-violet-700 dark:text-violet-100", dot: "bg-violet-400" },
  orange: { bg: "bg-orange-100 dark:bg-orange-900", text: "text-orange-700 dark:text-orange-100", dot: "bg-orange-400" },
  holiday: { bg: "bg-red-100 dark:bg-red-900", text: "text-red-700 dark:text-red-100", dot: "bg-red-400" },
};

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
  const colors = COLOR_MAP[event.color] ?? COLOR_MAP.sky;
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
      onClick={() => onClick?.(event)}
      className={`w-full min-w-0 overflow-hidden rounded px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight transition-opacity hover:opacity-80 ${colors.bg} ${colors.text}`}
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
