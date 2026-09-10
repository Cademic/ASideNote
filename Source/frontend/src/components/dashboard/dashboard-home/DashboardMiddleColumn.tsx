import { useState } from "react";
import { Plus, FolderOpen, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type {
  BoardSummaryDto,
  CalendarEventDto,
  NotebookSummaryDto,
  ProjectFolderDto,
  ProjectSummaryDto,
} from "../../../types";
import { useAuth } from "../../../context/AuthContext";
import { ProjectsTree } from "./ProjectsTree";
import { CalendarTimeGrid } from "../../calendar/CalendarTimeGrid";

interface DashboardMiddleColumnProps {
  projects: ProjectSummaryDto[];
  folders: ProjectFolderDto[];
  boards: BoardSummaryDto[];
  notebooks: NotebookSummaryDto[];
  /** Calendar events (incl. holidays) — the day schedule renders the same grid as the Calendar page's Day view. */
  events: CalendarEventDto[];
  projectNameMap: Record<string, string>;
  onOpenNotebook: (id: string) => void;
  onOpenUpcoming: (item: {
    event?: CalendarEventDto;
    project?: ProjectSummaryDto;
  }) => void;
  /**
   * Clicking an empty slot in the timeline — `dateStr` is `yyyy-MM-dd`, `time` is
   * `HH:MM`. `allDay` is set when the click lands in the all-day strip.
   */
  onCreateEventAt: (dateStr: string, time: string, allDay?: boolean) => void;
  onWorkspaceChanged: () => void | Promise<void>;
  onAddProject?: () => void;
}

// Calendar times are stored/read as UTC wall-clock, but that clock IS the viewer's local one
// (see calendar-event-save.ts), so a "day" is the UTC-midnight epoch of the viewer's LOCAL date.
function startOfToday(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/** Time-of-day greeting from the viewer's local hour. */
function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardMiddleColumn({
  projects,
  folders,
  boards,
  notebooks,
  events,
  projectNameMap,
  onOpenNotebook,
  onOpenUpcoming,
  onCreateEventAt,
  onWorkspaceChanged,
  onAddProject,
}: DashboardMiddleColumnProps) {
  const { user } = useAuth();
  const greeting = greetingForHour(new Date().getHours());
  const firstName = user?.username
    ? user.username.charAt(0).toUpperCase() + user.username.slice(1)
    : "";

  const [viewDate, setViewDate] = useState<Date>(startOfToday);
  const isViewingToday = viewDate.getTime() === startOfToday().getTime();
  const viewLabel = viewDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  // CalendarTimeGrid reads day fields with LOCAL getters (matching the Calendar
  // page), while `viewDate` is a UTC-midnight epoch — realign it to local midnight.
  const localViewDate = new Date(
    viewDate.getUTCFullYear(),
    viewDate.getUTCMonth(),
    viewDate.getUTCDate(),
  );
  const viewDateStr = `${localViewDate.getFullYear()}-${String(
    localViewDate.getMonth() + 1,
  ).padStart(2, "0")}-${String(localViewDate.getDate()).padStart(2, "0")}`;

  return (
    <div className="flex w-full flex-col bg-background lg:h-full lg:min-h-0 lg:flex-row">
      {/* Welcome + day schedule — right column on desktop */}
      <div className="flex flex-col lg:order-2 lg:min-h-0 lg:flex-1">
        {/* Greeting — sits directly above the timeline */}
        <div className="shrink-0 border-b border-[var(--land-rule)] px-5 pt-6 pb-5">
          <h2 className="text-xl font-bold text-[var(--land-ink)]">
            {greeting}
            {firstName && `, ${firstName}`}
          </h2>
          <p className="mt-1 text-sm text-[var(--land-ink-3)]">
            Welcome to ASideNote Dashboard
          </p>
        </div>

        {/* Day schedule */}
        <div className="flex flex-col lg:min-h-0 lg:flex-1">
          <div className="flex shrink-0 items-center gap-1.5 px-5 pt-5 pb-3">
            <CalendarDays className="h-4 w-4 shrink-0 text-[var(--land-ink-3)]" aria-hidden />
            <h2 className="min-w-0 flex-1 truncate text-base font-bold text-[var(--land-ink)]">
              {viewLabel}
            </h2>
            {!isViewingToday && (
              <button
                type="button"
                onClick={() => setViewDate(startOfToday())}
                className="rounded px-2 py-1 font-label text-[10px] uppercase tracking-wide text-[var(--land-ink-3)] transition-colors hover:bg-[var(--land-cream)] hover:text-[var(--land-ink)]"
              >
                Today
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewDate((d) => addDays(d, -1))}
              aria-label="Previous day"
              className="rounded p-1 text-[var(--land-ink-3)] transition-colors hover:bg-[var(--land-cream)] hover:text-[var(--land-ink)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewDate((d) => addDays(d, 1))}
              aria-label="Next day"
              className="rounded p-1 text-[var(--land-ink-3)] transition-colors hover:bg-[var(--land-cream)] hover:text-[var(--land-ink)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="scrollbar-thin px-5 pb-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <CalendarTimeGrid
              days={[localViewDate]}
              events={events}
              onClickDay={() => onCreateEventAt(viewDateStr, "09:00")}
              onClickAllDay={() => onCreateEventAt(viewDateStr, "", true)}
              onClickEvent={(event) => onOpenUpcoming({ event })}
              projectNameMap={projectNameMap}
              showDayHeader={false}
            />
          </div>
        </div>
      </div>

      {/* Projects — left column on desktop, spans the full height up to the navbar */}
      <div className="flex flex-col border-t border-[var(--land-rule)] bg-[var(--land-butter)] lg:order-1 lg:min-h-0 lg:w-[260px] lg:flex-none lg:border-r lg:border-t-0 xl:w-[300px]">
        <div className="flex shrink-0 items-center gap-2 px-5 pt-5 pb-3">
          <FolderOpen className="h-4 w-4 shrink-0 text-[var(--land-ink-3)]" aria-hidden />
          <h2 className="flex-1 text-base font-bold text-[var(--land-ink)]">Projects</h2>
          {onAddProject && (
            <button
              type="button"
              onClick={onAddProject}
              title="New project"
              className="rounded p-1 text-[var(--land-ink-3)] transition-colors hover:bg-[var(--land-paper)] hover:text-[var(--land-ink)]"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="scrollbar-thin px-2 pb-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <ProjectsTree
            projects={projects}
            folders={folders}
            boards={boards}
            notebooks={notebooks}
            onOpenNotebook={onOpenNotebook}
            onWorkspaceChanged={onWorkspaceChanged}
          />
        </div>
      </div>
    </div>
  );
}
