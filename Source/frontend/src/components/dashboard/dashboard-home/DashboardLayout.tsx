import { useEffect, useState } from "react";
import type {
  BoardSummaryDto,
  NotebookSummaryDto,
  ProjectFolderDto,
  ProjectSummaryDto,
} from "../../../types";
import type { UpcomingItem } from "../../../utils/dashboard-upcoming";
import { DashboardMiddleColumn } from "./DashboardMiddleColumn";
import { DashboardCanvasZone } from "./DashboardCanvasZone";

/** Matches the `lg:` breakpoint the layout uses to switch from stacked to side-by-side. */
const DESKTOP_BREAKPOINT = 1024;

/**
 * True once the viewport is wide enough for the side-by-side layout. Below this the
 * Active Canvas is dropped entirely (not just hidden) so the embedded board never
 * mounts or fetches on mobile.
 */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => window.innerWidth >= DESKTOP_BREAKPOINT,
  );

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    function handleChange(e: MediaQueryListEvent | MediaQueryList) {
      setIsDesktop(e.matches);
    }
    handleChange(mql);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isDesktop;
}

interface DashboardLayoutProps {
  projects: ProjectSummaryDto[];
  folders: ProjectFolderDto[];
  boards: BoardSummaryDto[];
  notebooks: NotebookSummaryDto[];
  upcoming: UpcomingItem[];
  activeBoard: BoardSummaryDto | null;
  onOpenNotebook: (id: string) => void;
  onOpenUpcoming: (item: UpcomingItem) => void;
  onCreateEventAt: (dateStr: string, time: string) => void;
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
  onCreateEventAt,
  onOpenActiveBoard,
  onWorkspaceChanged,
  onCreate,
}: DashboardLayoutProps) {
  const isDesktop = useIsDesktop();

  return (
    <div className="flex w-full min-w-0 flex-col lg:h-full lg:min-h-0 lg:flex-row lg:overflow-hidden">
      <div className="border-[var(--land-rule)] lg:h-full lg:min-h-0 lg:w-[460px] lg:flex-none lg:overflow-hidden lg:border-r xl:w-[560px]">
        <DashboardMiddleColumn
          projects={projects}
          folders={folders}
          boards={boards}
          notebooks={notebooks}
          upcoming={upcoming}
          isDesktop={isDesktop}
          onOpenNotebook={onOpenNotebook}
          onOpenUpcoming={onOpenUpcoming}
          onCreateEventAt={onCreateEventAt}
          onWorkspaceChanged={onWorkspaceChanged}
          onAddProject={onCreate}
        />
      </div>

      {isDesktop && (
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <DashboardCanvasZone
            board={activeBoard}
            onOpenBoard={onOpenActiveBoard}
            onCreate={onCreate}
          />
        </div>
      )}
    </div>
  );
}
