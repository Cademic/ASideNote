import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { AppLayoutContext } from "../components/layout/AppLayout";
import { getBoards } from "../api/boards";
import { getProjects, getProjectById } from "../api/projects";
import { getNotebooks } from "../api/notebooks";
import { deleteCalendarEvent, getCalendarEvents } from "../api/calendar-events";
import {
  saveCalendarEventFromForm,
  type CalendarEventFormData,
} from "../utils/calendar-event-save";
import { CreateEventDialog } from "../components/calendar/CreateEventDialog";
import { EventDetailsPopup } from "../components/calendar/EventDetailsPopup";
import { DashboardLayout } from "../components/dashboard/dashboard-home/DashboardLayout";
import { DashboardSkeleton } from "../components/dashboard/dashboard-home/DashboardSkeleton";
import type {
  BoardSummaryDto,
  CalendarEventDto,
  NotebookSummaryDto,
  ProjectFolderDto,
  ProjectSummaryDto,
} from "../types";
import { resolveEventProjectName } from "../utils/calendar-event-project-name";
import { buildProjectMarkerEvents } from "../utils/calendar-project-markers";
import { isProjectVisibleOnUserCalendar } from "../utils/calendar-project-visibility";
import { useHolidayEvents } from "../hooks/useHolidayEvents";
import { useDelayedLoading } from "../hooks/useDelayedLoading";

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
    requestCreate,
    refreshPinnedBoards,
    refreshPinnedProjects,
    refreshPinnedNotebooks,
  } = useOutletContext<AppLayoutContext>();

  const [boards, setBoards] = useState<BoardSummaryDto[]>([]);
  const [activeProjects, setActiveProjects] = useState<ProjectSummaryDto[]>([]);
  const [notebooks, setNotebooks] = useState<NotebookSummaryDto[]>([]);
  // Boards / notebooks linked to accessible projects — includes items shared by
  // other project members that /boards and /notebooks (own-items-only) omit.
  const [projectBoards, setProjectBoards] = useState<BoardSummaryDto[]>([]);
  const [projectNotebooks, setProjectNotebooks] = useState<
    NotebookSummaryDto[]
  >([]);
  const [projectFolders, setProjectFolders] = useState<ProjectFolderDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventDto[]>([]);
  const [detailsEvent, setDetailsEvent] = useState<CalendarEventDto | null>(
    null,
  );
  const [calendarEventDialogOpen, setCalendarEventDialogOpen] = useState(false);
  const [calendarEventDialogDate, setCalendarEventDialogDate] = useState("");
  const [calendarEventDialogTime, setCalendarEventDialogTime] = useState("");
  const [calendarEventDialogAllDay, setCalendarEventDialogAllDay] =
    useState(false);
  const [editingCalendarEvent, setEditingCalendarEvent] =
    useState<CalendarEventDto | null>(null);

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
        getProjects({ status: "Active" }).catch(
          () => [] as ProjectSummaryDto[],
        ),
        getNotebooks({ limit: 100 }).catch(() => ({
          items: [] as NotebookSummaryDto[],
          total: 0,
        })),
      ]);
      setBoards(boardResult.items);
      setActiveProjects(projectResult);
      setNotebooks(notebookResult.items);

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

  /**
   * Called after every Projects-tree mutation. Re-fetches the dashboard's own
   * data and also refreshes the app sidebar's pinned lists, so pinning /
   * unpinning (or deleting a pinned item) from the tree is reflected in the
   * sidebar without a reload.
   */
  const handleWorkspaceChanged = useCallback(async () => {
    await fetchDashboard();
    refreshPinnedBoards();
    refreshPinnedProjects();
    refreshPinnedNotebooks();
  }, [
    fetchDashboard,
    refreshPinnedBoards,
    refreshPinnedProjects,
    refreshPinnedNotebooks,
  ]);

  useEffect(() => {
    void refreshCalendarEvents();
  }, [refreshCalendarEvents]);

  /**
   * Boards / notebooks for the projects tree: the user's own items plus any
   * shared items linked to projects they can access.
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
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [activeProjects],
  );

  // Built-in holidays for the same 90-day window `refreshCalendarEvents` fetches
  // (togglable in Settings), merged into the Upcoming timeline alongside real events.
  const [holidayFrom, holidayTo] = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 90);
    return [start.toISOString(), end.toISOString()];
  }, []);
  const holidayEvents = useHolidayEvents(holidayFrom, holidayTo);

  // Project start/end shown as all-day markers on the timeline, matching the
  // Calendar. Only projects the user keeps on their personal calendar.
  const projectMarkerEvents = useMemo(
    () =>
      buildProjectMarkerEvents(
        activeProjects.filter(isProjectVisibleOnUserCalendar),
        { labelWithProjectName: true },
      ),
    [activeProjects],
  );

  // Calendar events + project markers + built-in holidays — feeds the dashboard
  // day schedule, which renders the same grid as the Calendar page's Day view.
  const timelineEvents = useMemo(
    () => [...calendarEvents, ...projectMarkerEvents, ...holidayEvents],
    [calendarEvents, projectMarkerEvents, holidayEvents],
  );

  const projectNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of activeProjects) map[p.id] = p.name;
    return map;
  }, [activeProjects]);

  // Hold the skeleton back until the load is actually slow, so a quick fetch
  // swaps straight to the real page instead of flashing the placeholder.
  const showSkeleton = useDelayedLoading(isLoading);

  function handleOpenNotebook(id: string) {
    navigate(`/notebooks/${id}`);
  }

  function handleOpenUpcoming(item: {
    event?: CalendarEventDto;
    project?: ProjectSummaryDto;
  }) {
    // Project start/end markers link back to the project, not the event popup.
    if (item.event?.eventType === "Project" && item.event.projectId) {
      navigate(`/projects/${item.event.projectId}`);
    } else if (item.event) {
      setDetailsEvent(item.event);
    } else if (item.project) {
      navigate(`/projects/${item.project.id}`);
    }
  }

  function handleEditFromEventDetails() {
    if (!detailsEvent) return;
    setEditingCalendarEvent(detailsEvent);
    setDetailsEvent(null);
    setCalendarEventDialogDate("");
    setCalendarEventDialogTime("");
    setCalendarEventDialogOpen(true);
  }

  /**
   * Clicking an empty slot in the dashboard timeline: new note prefilled to that
   * slot. Clicking the all-day strip passes `allDay` so the dialog opens as an
   * all-day event instead of a timed one.
   */
  function handleCreateNoteAt(dateStr: string, time: string, allDay = false) {
    setEditingCalendarEvent(null);
    setCalendarEventDialogDate(dateStr);
    setCalendarEventDialogTime(time);
    setCalendarEventDialogAllDay(allDay);
    setCalendarEventDialogOpen(true);
  }

  async function handleCalendarEventSave(data: CalendarEventFormData) {
    try {
      await saveCalendarEventFromForm(data, {
        editEvent: editingCalendarEvent,
      });
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
      const eventId =
        editingCalendarEvent.recurrenceSourceId ?? editingCalendarEvent.id;
      await deleteCalendarEvent(eventId);
      setCalendarEventDialogOpen(false);
      setEditingCalendarEvent(null);
      await refreshCalendarEvents();
    } catch {
      console.error("Failed to delete calendar event");
    }
  }

  if (isLoading || showSkeleton) {
    return (
      <div className="dashboard-editorial w-full min-w-0 bg-background lg:h-full lg:min-h-0 lg:overflow-hidden">
        {showSkeleton && (
          <div className="animate-page-enter motion-reduce:animate-none lg:h-full lg:min-h-0 lg:overflow-hidden">
            <DashboardSkeleton />
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-editorial animate-page-enter motion-reduce:animate-none flex h-full items-center justify-center bg-background">
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
    <div className="dashboard-editorial animate-page-enter motion-reduce:animate-none w-full min-w-0 bg-background lg:h-full lg:min-h-0 lg:overflow-hidden">
      <DashboardLayout
        projects={activeProjectsSorted}
        folders={projectFolders}
        boards={treeBoards}
        notebooks={treeNotebooks}
        events={timelineEvents}
        projectNameMap={projectNameMap}
        onOpenNotebook={handleOpenNotebook}
        onOpenUpcoming={handleOpenUpcoming}
        onCreateEventAt={handleCreateNoteAt}
        onWorkspaceChanged={handleWorkspaceChanged}
        onCreate={() => requestCreate()}
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
        initialTime={calendarEventDialogTime || undefined}
        initialEventType="Note"
        initialAllDay={calendarEventDialogAllDay}
        editEvent={editingCalendarEvent}
      />
    </div>
  );
}
