import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import axios from "axios";
import type { AppLayoutContext } from "../components/layout/AppLayout";
import { getBoards, createBoard } from "../api/boards";
import { getProjects, getProjectById, createProject } from "../api/projects";
import { getNotebooks, createNotebook } from "../api/notebooks";
import {
  deleteCalendarEvent,
  getCalendarEvents,
} from "../api/calendar-events";
import {
  saveCalendarEventFromForm,
  type CalendarEventFormData,
} from "../utils/calendar-event-save";
import { CreateBoardDialog } from "../components/dashboard/CreateBoardDialog";
import { CreateEventDialog } from "../components/calendar/CreateEventDialog";
import { EventDetailsPopup } from "../components/calendar/EventDetailsPopup";
import { DashboardLayout } from "../components/dashboard/dashboard-home/DashboardLayout";
import type {
  BoardSummaryDto,
  CalendarEventDto,
  NotebookSummaryDto,
  ProjectFolderDto,
  ProjectSummaryDto,
} from "../types";
import { resolveEventProjectName } from "../utils/calendar-event-project-name";
import { buildUpcomingItems } from "../utils/dashboard-upcoming";

/**
 * Merge two lists by `id`, keeping the entry from `base` when both contain the
 * same id. Used to fold project-scoped boards/notebooks (which may be owned by
 * other members) into the current user's own boards/notebooks without dropping
 * the richer owned copy.
 */
function mergeById<T extends { id: string }>(base: T[], extra: T[]): T[] {
  const map = new Map(base.map((item) => [item.id, item]));
  for (const item of extra) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()];
}

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    setDashboardBoardActive,
    createNonce,
    consumeCreate,
  } = useOutletContext<AppLayoutContext>();

  const [boards, setBoards] = useState<BoardSummaryDto[]>([]);
  const [activeProjects, setActiveProjects] = useState<ProjectSummaryDto[]>([]);
  const [notebooks, setNotebooks] = useState<NotebookSummaryDto[]>([]);
  // Boards / notebooks linked to accessible projects — includes items shared by
  // other project members that /boards and /notebooks (own-items-only) omit.
  const [projectBoards, setProjectBoards] = useState<BoardSummaryDto[]>([]);
  const [projectNotebooks, setProjectNotebooks] = useState<NotebookSummaryDto[]>([]);
  const [projectFolders, setProjectFolders] = useState<ProjectFolderDto[]>([]);
  const [totalNotebooks, setTotalNotebooks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createBoardError, setCreateBoardError] = useState<string | null>(null);
  const [createNotebookError, setCreateNotebookError] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventDto[]>([]);
  const [detailsEvent, setDetailsEvent] = useState<CalendarEventDto | null>(null);
  const [calendarEventDialogOpen, setCalendarEventDialogOpen] = useState(false);
  const [calendarEventDialogDate, setCalendarEventDialogDate] = useState("");
  const [editingCalendarEvent, setEditingCalendarEvent] = useState<CalendarEventDto | null>(null);

  const refreshCalendarEvents = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const future = new Date(today);
    future.setDate(future.getDate() + 90);
    try {
      const result = await getCalendarEvents({
        from: today.toISOString(),
        to: future.toISOString(),
      });
      setCalendarEvents(result);
    } catch {
      setCalendarEvents([]);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const [boardResult, projectResult, notebookResult] = await Promise.all([
        getBoards({ limit: 100 }),
        getProjects({ status: "Active" }).catch(() => [] as ProjectSummaryDto[]),
        getNotebooks({ limit: 100 }).catch(() => ({ items: [] as NotebookSummaryDto[], total: 0 })),
      ]);
      setBoards(boardResult.items);
      setActiveProjects(projectResult);
      setNotebooks(notebookResult.items);
      setTotalNotebooks(notebookResult.total ?? 0);

      // One detail call per accessible project: it carries the project's folders
      // plus every board and notebook linked to it — including ones owned by other
      // members — so the tree can show shared boards, not just the user's own.
      const projectDetails = await Promise.all(
        projectResult.map((p) => getProjectById(p.id).catch(() => null)),
      );
      setProjectFolders(projectDetails.flatMap((d) => d?.folders ?? []));
      setProjectBoards(projectDetails.flatMap((d) => d?.boards ?? []));
      setProjectNotebooks(projectDetails.flatMap((d) => d?.notebooks ?? []));
    } catch {
      setError("Failed to load your workspace.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    void refreshCalendarEvents();
  }, [refreshCalendarEvents]);

  /** Boards, most-recently-updated first. */
  const allBoards = useMemo(
    () => [...boards].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [boards],
  );

  /** The board shown in the Active Canvas: the user's most-recently-updated note board. */
  const activeCanvasBoard = useMemo(
    () => allBoards.find((b) => b.boardType === "NoteBoard") ?? null,
    [allBoards],
  );

  /**
   * Boards / notebooks for the projects tree: the user's own items plus any
   * shared items linked to projects they can access. Kept separate from `boards`
   * so the Active Canvas still tracks only the user's own note boards.
   */
  const treeBoards = useMemo(
    () => mergeById(boards, projectBoards),
    [boards, projectBoards],
  );
  const treeNotebooks = useMemo(
    () => mergeById(notebooks, projectNotebooks),
    [notebooks, projectNotebooks],
  );

  /** Projects, most-recently-created first — feeds the middle column. */
  const activeProjectsSorted = useMemo(
    () =>
      [...activeProjects].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [activeProjects],
  );

  const upcoming = useMemo(
    () => buildUpcomingItems(calendarEvents, activeProjects),
    [calendarEvents, activeProjects],
  );

  const projectNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of activeProjects) map[p.id] = p.name;
    return map;
  }, [activeProjects]);

  // Tell the sidebar a live board is mounted so it shows the sticky-note / index-card / image tools.
  useEffect(() => {
    setDashboardBoardActive(activeCanvasBoard != null);
    return () => setDashboardBoardActive(false);
  }, [activeCanvasBoard, setDashboardBoardActive]);

  // The rail "Create" button bumps createNonce — open the create dialog, then consume the
  // request so it doesn't re-fire when the dashboard remounts after navigating away and back.
  useEffect(() => {
    if (createNonce > 0) {
      setIsCreateOpen(true);
      consumeCreate();
    }
  }, [createNonce, consumeCreate]);

  function handleOpenNotebook(id: string) {
    navigate(`/notebooks/${id}`);
  }

  function handleOpenUpcoming(item: { event?: CalendarEventDto; project?: ProjectSummaryDto }) {
    if (item.event) setDetailsEvent(item.event);
    else if (item.project) navigate(`/projects/${item.project.id}`);
  }

  function handleEditFromEventDetails() {
    if (!detailsEvent) return;
    setEditingCalendarEvent(detailsEvent);
    setDetailsEvent(null);
    setCalendarEventDialogDate("");
    setCalendarEventDialogOpen(true);
  }

  async function handleCalendarEventSave(data: CalendarEventFormData) {
    try {
      await saveCalendarEventFromForm(data, { editEvent: editingCalendarEvent });
      setCalendarEventDialogOpen(false);
      setEditingCalendarEvent(null);
      await refreshCalendarEvents();
    } catch {
      console.error("Failed to save calendar event");
    }
  }

  async function handleCalendarEventDelete() {
    if (!editingCalendarEvent) return;
    try {
      const eventId = editingCalendarEvent.recurrenceSourceId ?? editingCalendarEvent.id;
      await deleteCalendarEvent(eventId);
      setCalendarEventDialogOpen(false);
      setEditingCalendarEvent(null);
      await refreshCalendarEvents();
    } catch {
      console.error("Failed to delete calendar event");
    }
  }

  async function handleCreateBoard(name: string, description: string, boardType: string) {
    try {
      setCreateBoardError(null);
      const created = await createBoard({ name, description: description || undefined, boardType });
      setBoards((prev) => [created, ...prev]);
      setIsCreateOpen(false);
      const path =
        created.boardType === "ChalkBoard" ? `/chalkboards/${created.id}` : `/boards/${created.id}`;
      navigate(path);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setCreateBoardError(err.response.data?.message ?? "A board with that name already exists.");
      } else {
        setCreateBoardError("Failed to create board. Please try again.");
        console.error("Failed to create board:", err);
      }
    }
  }

  async function handleCreateProject(
    name: string,
    description: string,
    color: string,
    startDate?: string,
    endDate?: string,
    deadline?: string,
  ) {
    try {
      setCreateBoardError(null);
      const created = await createProject({
        name,
        description: description || undefined,
        color,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        deadline: deadline || undefined,
      });
      setIsCreateOpen(false);
      navigate(`/projects/${created.id}`);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setCreateBoardError(err.response.data?.message ?? "A project with that name already exists.");
      } else {
        setCreateBoardError("Failed to create project. Please try again.");
        console.error("Failed to create project:", err);
      }
    }
  }

  async function handleCreateNotebook(name: string) {
    try {
      setCreateNotebookError(null);
      const created = await createNotebook({ name });
      setTotalNotebooks((t) => t + 1);
      setIsCreateOpen(false);
      navigate(`/notebooks/${created.id}`);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setCreateNotebookError(
          err.response.data?.message ?? "Maximum 5 notebooks allowed. Delete one to create another.",
        );
      } else {
        setCreateNotebookError("Failed to create notebook. Please try again.");
        console.error("Failed to create notebook:", err);
      }
    }
  }

  if (isLoading) {
    return (
      <div className="dashboard-editorial flex h-full items-center justify-center bg-[var(--land-cream)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--land-amber)] border-t-transparent" />
          <span className="text-sm text-[var(--land-ink-2)]">Loading your workspace...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-editorial flex h-full items-center justify-center bg-[var(--land-cream)]">
        <div className="text-center">
          <p className="mb-2 text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={fetchDashboard}
            className="rounded-lg bg-[var(--land-amber)] px-4 py-2 text-sm font-medium text-[var(--land-on-accent)] hover:brightness-95"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-editorial h-full min-h-0 w-full min-w-0 overflow-hidden bg-[var(--land-cream)]">
      <DashboardLayout
        projects={activeProjectsSorted}
        folders={projectFolders}
        boards={treeBoards}
        notebooks={treeNotebooks}
        upcoming={upcoming}
        activeBoard={activeCanvasBoard}
        onOpenNotebook={handleOpenNotebook}
        onOpenUpcoming={handleOpenUpcoming}
        onOpenActiveBoard={() => {
          if (activeCanvasBoard) navigate(`/boards/${activeCanvasBoard.id}`);
        }}
        onWorkspaceChanged={fetchDashboard}
        onCreate={() => setIsCreateOpen(true)}
      />

      <CreateBoardDialog
        isOpen={isCreateOpen}
        error={createBoardError}
        createNotebookError={createNotebookError}
        canCreateNotebook={totalNotebooks < 5}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateBoardError(null);
          setCreateNotebookError(null);
        }}
        onCreateBoard={handleCreateBoard}
        onCreateProject={handleCreateProject}
        onCreateNotebook={handleCreateNotebook}
      />

      {detailsEvent && (
        <EventDetailsPopup
          event={detailsEvent}
          projectName={resolveEventProjectName(detailsEvent, projectNameMap)}
          isOpen={!!detailsEvent}
          onClose={() => setDetailsEvent(null)}
          onEdit={handleEditFromEventDetails}
        />
      )}

      <CreateEventDialog
        isOpen={calendarEventDialogOpen}
        onClose={() => {
          setCalendarEventDialogOpen(false);
          setEditingCalendarEvent(null);
        }}
        onSave={handleCalendarEventSave}
        onDelete={editingCalendarEvent ? handleCalendarEventDelete : undefined}
        initialDate={calendarEventDialogDate}
        editEvent={editingCalendarEvent}
      />
    </div>
  );
}
