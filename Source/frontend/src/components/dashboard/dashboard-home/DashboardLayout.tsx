import type {
  BoardSummaryDto,
  CalendarEventDto,
  NotebookSummaryDto,
  ProjectFolderDto,
  ProjectSummaryDto,
} from "../../../types";
import { DashboardMiddleColumn } from "./DashboardMiddleColumn";

interface DashboardLayoutProps {
  projects: ProjectSummaryDto[];
  folders: ProjectFolderDto[];
  boards: BoardSummaryDto[];
  notebooks: NotebookSummaryDto[];
  /** Calendar events (incl. holidays) for the day schedule. */
  events: CalendarEventDto[];
  projectNameMap: Record<string, string>;
  onOpenNotebook: (id: string) => void;
  onOpenUpcoming: (item: {
    event?: CalendarEventDto;
    project?: ProjectSummaryDto;
  }) => void;
  onCreateEventAt: (dateStr: string, time: string, allDay?: boolean) => void;
  onWorkspaceChanged: () => void | Promise<void>;
  onCreate: () => void;
}

/**
 * The dashboard's edge-to-edge panel layout: the "Projects + Upcoming" column. The
 * nav rail is the shared app Sidebar (rendered by AppLayout), not part of this tree.
 */
export function DashboardLayout({
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
  onCreate,
}: DashboardLayoutProps) {
  return (
    <div className="flex w-full min-w-0 flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
      <div className="lg:h-full lg:min-h-0 lg:overflow-hidden">
        <DashboardMiddleColumn
          projects={projects}
          folders={folders}
          boards={boards}
          notebooks={notebooks}
          events={events}
          projectNameMap={projectNameMap}
          onOpenNotebook={onOpenNotebook}
          onOpenUpcoming={onOpenUpcoming}
          onCreateEventAt={onCreateEventAt}
          onWorkspaceChanged={onWorkspaceChanged}
          onAddProject={onCreate}
        />
      </div>
    </div>
  );
}
