import type { CalendarEventDto } from "../../types";

const COLOR_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  sky: { bg: "bg-sky-100 dark:bg-sky-950/40", text: "text-sky-700 dark:text-sky-300", dot: "bg-sky-400" },
  amber: { bg: "bg-amber-100 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-400" },
  rose: { bg: "bg-rose-100 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-400" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-400" },
  violet: { bg: "bg-violet-100 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-400" },
  orange: { bg: "bg-orange-100 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-400" },
};

interface CalendarEventItemProps {
  event: CalendarEventDto;
  onClick?: (event: CalendarEventDto) => void;
  compact?: boolean;
  projectName?: string | null;
}

export function CalendarEventItem({ event, onClick, compact, projectName }: CalendarEventItemProps) {
  const colors = COLOR_MAP[event.color] ?? COLOR_MAP.sky;
  const displayTitle = projectName ? `${projectName}: ${event.title}` : event.title;

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
        {projectName && (
          <span className="opacity-60">{projectName}: </span>
        )}
        {event.title}
      </span>
    </button>
  );
}
