import { FolderOpen } from "lucide-react";
import type { ProjectSummaryDto } from "../../types";
import { resolveCalendarEventColor } from "../../utils/calendar-event-colors";

interface CalendarProjectBarProps {
  project: ProjectSummaryDto;
  onClick?: (project: ProjectSummaryDto) => void;
}

export function CalendarProjectBar({ project, onClick }: CalendarProjectBarProps) {
  const colors = resolveCalendarEventColor(project.color || "violet");
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(project);
      }}
      className={`flex w-full min-w-0 items-center gap-1 overflow-hidden rounded border px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight transition-opacity hover:opacity-80 ${colors.bg} ${colors.text} ${colors.border}`}
      title={`Project: ${project.name}`}
    >
      <FolderOpen className="h-3 w-3 flex-shrink-0" />
      <span className="block min-w-0 truncate">{project.name}</span>
    </button>
  );
}
