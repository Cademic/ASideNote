import type {
  BoardSummaryDto,
  NotebookSummaryDto,
  ProjectFolderDto,
  ProjectSummaryDto,
} from "../../../types";
import type { UpcomingItem } from "../../../utils/dashboard-upcoming";
import { DashboardMiddleColumn } from "./DashboardMiddleColumn";
import { DashboardCanvasZone } from "./DashboardCanvasZone";

interface DashboardLayoutProps {
  projects: ProjectSummaryDto[];
  folders: ProjectFolderDto[];
  boards: BoardSummaryDto[];
  notebooks: NotebookSummaryDto[];
  upcoming: UpcomingItem[];
  activeBoard: BoardSummaryDto | null;
  onOpenNotebook: (id: string) => void;
  onOpenUpcoming: (item: UpcomingItem) => void;
  onOpenActiveBoard: () => void;
  onWorkspaceChanged: () => void | Promise<void>;
  onCreate: () => void;
}

/**
 * The dashboard's edge-to-edge panel layout: the "Projects + Upcoming" column sits flush
 * against the Active Canvas, divided only by a 1px rule. The nav rail is the shared app
 * Sidebar (rendered by AppLayout), not part of this tree.
 */
export function DashboardLayout({
  projects,
  folders,
  boards,
  notebooks,
  upcoming,
  activeBoard,
  onOpenNotebook,
  onOpenUpcoming,
  onOpenActiveBoard,
  onWorkspaceChanged,
  onCreate,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden lg:flex-row">
      <div className="min-h-0 shrink-0 overflow-hidden border-b border-[var(--land-rule)] lg:h-full lg:w-[460px] lg:border-b-0 lg:border-r xl:w-[560px]">
        <DashboardMiddleColumn
          projects={projects}
          folders={folders}
          boards={boards}
          notebooks={notebooks}
          upcoming={upcoming}
          onOpenNotebook={onOpenNotebook}
          onOpenUpcoming={onOpenUpcoming}
          onWorkspaceChanged={onWorkspaceChanged}
          onAddProject={onCreate}
        />
      </div>

      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <DashboardCanvasZone
          board={activeBoard}
          onOpenBoard={onOpenActiveBoard}
          onCreate={onCreate}
        />
      </div>
    </div>
  );
}
