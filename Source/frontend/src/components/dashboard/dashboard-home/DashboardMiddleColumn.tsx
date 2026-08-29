import { useState } from "react";
import { Plus, FolderOpen, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { BoardSummaryDto, NotebookSummaryDto, ProjectFolderDto, ProjectSummaryDto } from "../../../types";
import type { UpcomingItem } from "../../../utils/dashboard-upcoming";
import { useAuth } from "../../../context/AuthContext";
import { ProjectsTree } from "./ProjectsTree";
import { UpcomingTimeline } from "./UpcomingTimeline";

interface DashboardMiddleColumnProps {
  projects: ProjectSummaryDto[];
  folders: ProjectFolderDto[];
  boards: BoardSummaryDto[];
  notebooks: NotebookSummaryDto[];
  upcoming: UpcomingItem[];
  /** Wide layout: two independently-scrolling panels. Narrow: one page scroll. */
  isDesktop: boolean;
  onOpenNotebook: (id: string) => void;
  onOpenUpcoming: (item: UpcomingItem) => void;
  /** Clicking an empty hour in the timeline — `dateStr` is `yyyy-MM-dd`, `time` is `HH:MM`. */
  onCreateEventAt: (dateStr: string, time: string) => void;
  onWorkspaceChanged: () => void | Promise<void>;
  onAddProject?: () => void;
}

// Calendar times are stored/read as UTC wall-clock, but that clock IS the viewer's local one
// (see UpcomingTimeline), so a "day" is the UTC-midnight epoch of the viewer's LOCAL date.
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
  upcoming,
  isDesktop,
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

  return (
    <div className="flex w-full flex-col bg-[var(--land-paper)] lg:h-full lg:min-h-0">
      {/* Greeting — stays first on both layouts */}
      <div className="shrink-0 border-b border-[var(--land-rule)] px-5 pt-6 pb-5">
        <h2 className="text-xl font-bold text-[var(--land-ink)]">
          {greeting}
          {firstName && `, ${firstName}`}
        </h2>
      </div>

      {/* Projects — below the timeline on mobile, above it on desktop */}
      <div className="order-3 flex flex-col border-t border-[var(--land-rule)] bg-[var(--land-butter)] lg:order-none lg:min-h-0 lg:shrink-0 lg:border-t-0">
        <div className="flex items-center gap-2 px-5 pt-5 pb-3">
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
        <div className="px-2 pb-4 lg:max-h-[45vh] lg:overflow-y-auto">
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

      {/* Day schedule — directly under the greeting on mobile */}
      <div className="order-2 flex flex-col border-t border-[var(--land-rule)] lg:order-none lg:min-h-0 lg:flex-1">
        <div className="flex items-center gap-1.5 px-5 pt-5 pb-3">
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
        <div className="px-5 pb-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <UpcomingTimeline
            items={upcoming}
            viewDate={viewDate}
            onOpen={onOpenUpcoming}
            autoScrollToNow={isDesktop}
            onCreateAt={(hour) =>
              onCreateEventAt(
                viewDate.toISOString().slice(0, 10),
                `${String(hour).padStart(2, "0")}:00`,
              )
            }
          />
        </div>
      </div>
    </div>
  );
}
